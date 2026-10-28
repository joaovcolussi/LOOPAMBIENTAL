import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@loopambiental/database';
import { PrismaService } from '../../infrastructure/prisma.service';
import { OutboxService } from '../../infrastructure/outbox.service';
import { MercadoPagoAdapter } from './mercado-pago.adapter';

const PAYABLE_DEAL_STATUSES: readonly string[] = [
  'OPEN',
  'AWAITING_DOCUMENTS',
  'AWAITING_PAYMENT',
];

@Injectable()
export class PaymentsService {
  private readonly mercadoPago = new MercadoPagoAdapter();

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

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
    // buyer from paying two Mercado Pago links for the same deal.
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
          dealId,
          companyId: deal.buyerCompanyId,
          provider: 'MERCADO_PAGO',
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
    try {
      const checkout = await this.mercadoPago.createCheckout({
        transactionId: transaction.id,
        title: deal.proposal.listing.title,
        amount,
      });
      const payment = await this.prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          externalId: checkout.externalId,
          checkoutUrl: checkout.checkoutUrl,
          status: 'PENDING',
        },
      });
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
    } catch (error) {
      try {
        await this.prisma.paymentTransaction.update({
          where: { id: transaction.id },
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

  listForUser(userId: string): Promise<unknown> {
    return this.prisma.paymentTransaction.findMany({
      where: { company: { members: { some: { userId } } } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        dealId: true,
        amount: true,
        currency: true,
        provider: true,
        status: true,
        checkoutUrl: true,
        paidAt: true,
        createdAt: true,
        deal: {
          select: {
            proposal: { select: { listing: { select: { title: true } } } },
          },
        },
      },
    });
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
    const status = this.mapStatus(payment.status);
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { id: payment.external_reference },
      select: {
        id: true,
        dealId: true,
        companyId: true,
        deal: { select: { status: true } },
      },
    });
    if (!transaction) return { received: true };
    // Idempotency: settle a transaction exactly once. A replayed webhook (or a
    // concurrent one) cannot reapply the deal transition or enqueue a duplicate
    // event, and all writes share a single transaction.
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.paymentTransaction.updateMany({
        where: { id: payment.external_reference, status: { not: 'PAID' } },
        data: {
          status,
          metadata: {
            mercadoPagoPaymentId: payment.id ?? dataId,
            mercadoPagoStatus: payment.status,
          },
          ...(status === 'PAID' ? { paidAt: new Date() } : {}),
        },
      });
      if (claimed.count === 0) return;
      if (status !== 'PAID') return;
      // Only a deal still waiting for payment advances; a late or duplicate
      // payment must never move a shipped or completed deal backwards.
      const advanced = await tx.deal.updateMany({
        where: {
          id: transaction.dealId,
          status: { in: ['OPEN', 'AWAITING_DOCUMENTS', 'AWAITING_PAYMENT'] },
        },
        data: { status: 'AWAITING_PICKUP' },
      });
      if (advanced.count === 1)
        await tx.dealStatusHistory.create({
          data: {
            dealId: transaction.dealId,
            fromStatus: transaction.deal.status,
            toStatus: 'AWAITING_PICKUP',
            actorUserId: null,
            note: 'PAYMENT_CONFIRMED',
          },
        });
      await this.outbox.enqueueWithin(tx, {
        type: 'payment.confirmed',
        aggregateType: 'PAYMENT_TRANSACTION',
        aggregateId: transaction.id,
        payload: {
          paymentId: transaction.id,
          dealId: transaction.dealId,
          companyId: transaction.companyId,
        },
      });
    });
    return { received: true };
  }

  private mapStatus(status?: string) {
    if (status === 'approved') return 'PAID' as const;
    if (status === 'cancelled') return 'CANCELLED' as const;
    if (status === 'rejected') return 'FAILED' as const;
    return 'PENDING' as const;
  }
}
