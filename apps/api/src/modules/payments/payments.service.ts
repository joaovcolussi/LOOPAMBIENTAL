import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DealStatus, Prisma } from '@loopambiental/database';
import { PrismaService } from '../../infrastructure/prisma.service';
import { OutboxService } from '../../infrastructure/outbox.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MercadoPagoAdapter } from './mercado-pago.adapter';
import { createPaymentProvider, PaymentProvider } from './payment-provider';

const PAYABLE_DEAL_STATUSES: readonly string[] = [
  'OPEN',
  'AWAITING_DOCUMENTS',
  'AWAITING_PAYMENT',
];

const SUBSCRIPTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

type SettlementStatus = 'PAID' | 'FAILED' | 'CANCELLED' | 'PENDING';

export type ChargeInput = {
  purpose: 'SUBSCRIPTION' | 'CONTACT_UNLOCK';
  userId: string;
  companyId: string;
  amount: string;
  title: string;
  subscriptionId?: string;
  listingId?: string;
  metadata?: Record<string, string>;
};

const paymentSelect = {
  id: true,
  purpose: true,
  dealId: true,
  subscriptionId: true,
  listingId: true,
  companyId: true,
  amount: true,
  currency: true,
  provider: true,
  status: true,
  checkoutUrl: true,
  paidAt: true,
  createdAt: true,
} as const;

@Injectable()
export class PaymentsService {
  // Webhooks are always verified against Mercado Pago; checkouts use the
  // configured provider (the simulated sandbox outside production).
  private readonly mercadoPago = new MercadoPagoAdapter();
  private readonly provider: PaymentProvider = createPaymentProvider();

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  get providerName() {
    return this.provider.name;
  }

  async createCheckout(
    userId: string,
    dealId: string,
    idempotencyKey: string,
  ): Promise<unknown> {
    if (!idempotencyKey || idempotencyKey.length > 100)
      throw new BadRequestException('INVALID_IDEMPOTENCY_KEY');
    const existing = await this.prisma.paymentTransaction.findFirst({
      where: {
        idempotencyKey,
        company: { members: { some: { userId } } },
      },
    });
    if (existing) return existing;
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        proposal: {
          select: {
            quantity: true,
            unitPrice: true,
            listing: { select: { title: true } },
          },
        },
      },
    });
    if (!deal) throw new NotFoundException('DEAL_NOT_FOUND');
    const membership = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId: deal.buyerCompanyId, userId } },
    });
    if (!membership) throw new ForbiddenException('DEAL_ACCESS_DENIED');
    // Only deals that have not been paid yet can open a checkout. A paid,
    // shipped, completed or cancelled deal must never be charged again nor
    // moved back to AWAITING_PAYMENT.
    if (!PAYABLE_DEAL_STATUSES.includes(deal.status))
      throw new BadRequestException('DEAL_NOT_PAYABLE');
    const alreadyPaid = await this.prisma.paymentTransaction.findFirst({
      where: { dealId, status: 'PAID' },
      select: { id: true },
    });
    if (alreadyPaid) throw new BadRequestException('DEAL_ALREADY_PAID');
    // One live checkout per deal: reusing the pending preference prevents the
    // buyer from paying two links for the same deal.
    const pending = await this.prisma.paymentTransaction.findFirst({
      where: { dealId, status: 'PENDING', checkoutUrl: { not: null } },
      orderBy: { createdAt: 'desc' },
    });
    if (pending) return pending;
    const amount = new Prisma.Decimal(deal.proposal.quantity)
      .mul(new Prisma.Decimal(deal.proposal.unitPrice))
      .toFixed(2);
    let transaction: { id: string };
    try {
      transaction = await this.prisma.paymentTransaction.create({
        data: {
          idempotencyKey,
          purpose: 'DEAL',
          dealId,
          companyId: deal.buyerCompanyId,
          createdByUserId: userId,
          provider: this.provider.name,
          amount,
          status: 'INITIATED',
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrent = await this.prisma.paymentTransaction.findFirst({
          where: {
            idempotencyKey,
            company: { members: { some: { userId } } },
          },
        });
        if (concurrent) return concurrent;
      }
      throw error;
    }
    const payment = await this.openCheckout(
      transaction.id,
      deal.proposal.listing.title,
      amount,
    );
    if (deal.status !== 'AWAITING_PAYMENT')
      await this.prisma.$transaction(async (tx) => {
        const changed = await tx.deal.updateMany({
          where: { id: dealId, status: deal.status },
          data: { status: 'AWAITING_PAYMENT' },
        });
        if (changed.count !== 1) return;
        await tx.dealStatusHistory.create({
          data: {
            dealId,
            fromStatus: deal.status,
            toStatus: 'AWAITING_PAYMENT',
            actorUserId: userId,
            note: 'CHECKOUT_CREATED',
          },
        });
      });
    return payment;
  }

  /**
   * Opens a charge that is not tied to a deal (subscription or one-time contact
   * unlock). A pending charge for the same target is reused, so repeated clicks
   * never produce two payable checkouts.
   */
  async createCharge(input: ChargeInput) {
    const pending = await this.prisma.paymentTransaction.findFirst({
      where: {
        purpose: input.purpose,
        companyId: input.companyId,
        status: 'PENDING',
        checkoutUrl: { not: null },
        ...(input.subscriptionId
          ? { subscriptionId: input.subscriptionId }
          : {}),
        ...(input.listingId ? { listingId: input.listingId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: { ...paymentSelect, amount: true, metadata: true },
    });
    if (
      pending &&
      new Prisma.Decimal(pending.amount).equals(input.amount) &&
      this.sameMetadata(pending.metadata, input.metadata)
    )
      return pending;
    if (pending)
      await this.prisma.paymentTransaction.updateMany({
        where: { id: pending.id, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        idempotencyKey: `${input.purpose.toLowerCase()}:${randomUUID()}`,
        purpose: input.purpose,
        companyId: input.companyId,
        createdByUserId: input.userId,
        subscriptionId: input.subscriptionId,
        listingId: input.listingId,
        provider: this.provider.name,
        amount: input.amount,
        status: 'INITIATED',
        metadata: input.metadata ?? undefined,
      },
    });
    return this.openCheckout(transaction.id, input.title, input.amount);
  }

  listForUser(userId: string): Promise<unknown> {
    return this.prisma.paymentTransaction.findMany({
      where: { company: { members: { some: { userId } } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        ...paymentSelect,
        deal: {
          select: {
            proposal: { select: { listing: { select: { title: true } } } },
          },
        },
        listing: { select: { title: true, slug: true } },
        subscription: { select: { plan: { select: { name: true } } } },
      },
    });
  }

  async getForUser(userId: string, id: string): Promise<unknown> {
    const payment = await this.prisma.paymentTransaction.findFirst({
      where: { id, company: { members: { some: { userId } } } },
      select: {
        ...paymentSelect,
        company: { select: { legalName: true, tradeName: true } },
        deal: {
          select: {
            proposal: { select: { listing: { select: { title: true } } } },
          },
        },
        listing: { select: { title: true, slug: true } },
        subscription: { select: { plan: { select: { name: true } } } },
      },
    });
    if (!payment) throw new NotFoundException('PAYMENT_NOT_FOUND');
    return payment;
  }

  /**
   * Demo-only settlement: lets a company member approve or refuse a charge
   * created by the simulated provider. Real providers settle via webhook.
   */
  async simulate(
    userId: string,
    id: string,
    outcome: string,
  ): Promise<unknown> {
    if (outcome !== 'approved' && outcome !== 'rejected')
      throw new BadRequestException('INVALID_PAYMENT_OUTCOME');
    const payment = await this.prisma.paymentTransaction.findFirst({
      where: { id, company: { members: { some: { userId } } } },
      select: { id: true, provider: true, status: true },
    });
    if (!payment) throw new NotFoundException('PAYMENT_NOT_FOUND');
    if (payment.provider !== 'SIMULATED')
      throw new BadRequestException('PAYMENT_NOT_SIMULATED');
    if (payment.status !== 'PENDING')
      throw new BadRequestException('PAYMENT_ALREADY_SETTLED');
    await this.settle(payment.id, outcome === 'approved' ? 'PAID' : 'FAILED', {
      simulatedOutcome: outcome,
      simulatedBy: userId,
    });
    return this.getForUser(userId, id);
  }

  async handleWebhook(
    signature: string | undefined,
    requestId: string | undefined,
    dataId: string | undefined,
    type: string | undefined,
  ): Promise<unknown> {
    if (!this.mercadoPago.verifyWebhookSignature(signature, requestId, dataId))
      throw new ForbiddenException('INVALID_PAYMENT_WEBHOOK');
    if (type !== 'payment' || !dataId) return { received: true };
    const payment = await this.mercadoPago.getPayment(dataId);
    if (!payment.external_reference) return { received: true };
    await this.settle(
      payment.external_reference,
      this.mapStatus(payment.status),
      {
        mercadoPagoPaymentId: payment.id ?? dataId,
        mercadoPagoStatus: payment.status ?? '',
      },
    );
    return { received: true };
  }

  /**
   * Settles a transaction exactly once. A replayed webhook (or a concurrent
   * one) cannot reapply the business effect or enqueue a duplicate event, and
   * all writes share a single database transaction.
   */
  async settle(
    transactionId: string,
    status: SettlementStatus,
    providerMetadata: Record<string, string>,
  ) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        purpose: true,
        dealId: true,
        subscriptionId: true,
        listingId: true,
        companyId: true,
        createdByUserId: true,
        provider: true,
        metadata: true,
        deal: { select: { status: true } },
      },
    });
    if (!transaction) return false;
    const metadata = {
      ...(this.asRecord(transaction.metadata) ?? {}),
      ...providerMetadata,
    };
    const settled = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.paymentTransaction.updateMany({
        where: { id: transaction.id, status: { not: 'PAID' } },
        data: {
          status,
          metadata: metadata as Prisma.InputJsonObject,
          ...(status === 'PAID' ? { paidAt: new Date() } : {}),
        },
      });
      if (claimed.count === 0) return false;
      if (status !== 'PAID') return false;
      if (transaction.purpose === 'DEAL' && transaction.dealId)
        await this.applyDealPayment(tx, transaction.dealId, transaction.deal);
      if (transaction.purpose === 'SUBSCRIPTION' && transaction.subscriptionId)
        await this.applySubscriptionPayment(tx, {
          subscriptionId: transaction.subscriptionId,
          companyId: transaction.companyId,
          planId: typeof metadata.planId === 'string' ? metadata.planId : null,
          provider: transaction.provider,
          actorUserId: transaction.createdByUserId,
        });
      if (
        transaction.purpose === 'CONTACT_UNLOCK' &&
        transaction.listingId &&
        transaction.createdByUserId
      )
        await this.applyContactUnlockPayment(tx, {
          companyId: transaction.companyId,
          listingId: transaction.listingId,
          userId: transaction.createdByUserId,
          paymentId: transaction.id,
        });
      await this.outbox.enqueueWithin(tx, {
        type: 'payment.confirmed',
        aggregateType: 'PAYMENT_TRANSACTION',
        aggregateId: transaction.id,
        payload: {
          paymentId: transaction.id,
          purpose: transaction.purpose,
          dealId: transaction.dealId,
          subscriptionId: transaction.subscriptionId,
          listingId: transaction.listingId,
          companyId: transaction.companyId,
        },
      });
      return true;
    });
    if (settled && transaction.createdByUserId)
      await this.notifications?.create(transaction.createdByUserId, {
        type: 'PAYMENT_CONFIRMED',
        title: 'Pagamento confirmado',
        body: this.confirmationMessage(transaction.purpose),
        payload: { paymentId: transaction.id },
      });
    return settled;
  }

  private async openCheckout(id: string, title: string, amount: string) {
    try {
      const checkout = await this.provider.createCheckout({
        transactionId: id,
        title,
        amount,
      });
      return await this.prisma.paymentTransaction.update({
        where: { id },
        data: {
          externalId: checkout.externalId,
          checkoutUrl: checkout.checkoutUrl,
          status: 'PENDING',
        },
        select: paymentSelect,
      });
    } catch (error) {
      try {
        await this.prisma.paymentTransaction.update({
          where: { id },
          data: {
            status: 'FAILED',
            metadata: {
              error:
                error instanceof Error
                  ? error.message
                  : 'PAYMENT_PROVIDER_ERROR',
            },
          },
        });
      } catch {
        // Preserve the provider error if the database is unavailable as well.
      }
      throw new ServiceUnavailableException('PAYMENT_PROVIDER_UNAVAILABLE');
    }
  }

  private async applyDealPayment(
    tx: Prisma.TransactionClient,
    dealId: string,
    deal: { status: DealStatus } | null,
  ) {
    // Only a deal still waiting for payment advances; a late or duplicate
    // payment must never move a shipped or completed deal backwards.
    const advanced = await tx.deal.updateMany({
      where: {
        id: dealId,
        status: { in: ['OPEN', 'AWAITING_DOCUMENTS', 'AWAITING_PAYMENT'] },
      },
      data: { status: 'AWAITING_PICKUP' },
    });
    if (advanced.count === 1)
      await tx.dealStatusHistory.create({
        data: {
          dealId,
          fromStatus: deal?.status ?? 'AWAITING_PAYMENT',
          toStatus: 'AWAITING_PICKUP',
          actorUserId: null,
          note: 'PAYMENT_CONFIRMED',
        },
      });
  }

  private async applySubscriptionPayment(
    tx: Prisma.TransactionClient,
    input: {
      subscriptionId: string;
      companyId: string;
      planId: string | null;
      provider: string;
      actorUserId: string | null;
    },
  ) {
    const now = new Date();
    // A paid upgrade replaces whatever plan was active before.
    await tx.subscription.updateMany({
      where: {
        companyId: input.companyId,
        status: { in: ['ACTIVE', 'PAST_DUE'] },
        id: { not: input.subscriptionId },
      },
      data: { status: 'CANCELLED', cancelledAt: now },
    });
    await tx.subscription.update({
      where: { id: input.subscriptionId },
      data: {
        status: 'ACTIVE',
        provider: input.provider,
        ...(input.planId ? { planId: input.planId } : {}),
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getTime() + SUBSCRIPTION_PERIOD_MS),
        cancelAt: null,
        cancelledAt: null,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: 'SUBSCRIPTION_ACTIVATED',
        resourceType: 'SUBSCRIPTION',
        resourceId: input.subscriptionId,
        metadata: {
          companyId: input.companyId,
          planId: input.planId,
          source: 'PAYMENT',
        },
      },
    });
  }

  private async applyContactUnlockPayment(
    tx: Prisma.TransactionClient,
    input: {
      companyId: string;
      listingId: string;
      userId: string;
      paymentId: string;
    },
  ) {
    const existing = await tx.contactUnlock.findUnique({
      where: {
        companyId_listingId: {
          companyId: input.companyId,
          listingId: input.listingId,
        },
      },
      select: { id: true },
    });
    if (existing) return;
    await tx.contactUnlock.create({
      data: {
        companyId: input.companyId,
        listingId: input.listingId,
        userId: input.userId,
        source: 'ONE_TIME',
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: input.userId,
        action: 'CONTACT_UNLOCKED',
        resourceType: 'LISTING',
        resourceId: input.listingId,
        metadata: {
          companyId: input.companyId,
          source: 'ONE_TIME',
          paymentId: input.paymentId,
        },
      },
    });
  }

  private confirmationMessage(purpose: string) {
    if (purpose === 'SUBSCRIPTION')
      return 'O pagamento da assinatura foi confirmado e o plano está ativo.';
    if (purpose === 'CONTACT_UNLOCK')
      return 'O pagamento foi confirmado e o contato do anúncio foi liberado.';
    return 'O pagamento da negociação foi confirmado. A coleta já pode ser agendada.';
  }

  private sameMetadata(
    stored: unknown,
    expected: Record<string, string> | undefined,
  ) {
    const record = this.asRecord(stored) ?? {};
    return Object.entries(expected ?? {}).every(
      ([key, value]) => record[key] === value,
    );
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  }

  private mapStatus(status?: string): SettlementStatus {
    if (status === 'approved') return 'PAID';
    if (status === 'cancelled') return 'CANCELLED';
    if (status === 'rejected') return 'FAILED';
    return 'PENDING';
  }
}
