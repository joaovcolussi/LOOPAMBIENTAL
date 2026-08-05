import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import { MercadoPagoAdapter } from './mercado-pago.adapter';

@Injectable()
export class PaymentsService {
  private readonly mercadoPago = new MercadoPagoAdapter();

  constructor(private readonly prisma: PrismaService) {}

  async createCheckout(
    userId: string,
    dealId: string,
    idempotencyKey: string,
  ): Promise<unknown> {
    if (!idempotencyKey || idempotencyKey.length > 100)
      throw new BadRequestException('INVALID_IDEMPOTENCY_KEY');
    const existing = await this.prisma.paymentTransaction.findUnique({
      where: { idempotencyKey },
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
    if (deal.status === 'CANCELLED')
      throw new BadRequestException('DEAL_NOT_PAYABLE');
    const amount = (
      Number(deal.proposal.quantity) * Number(deal.proposal.unitPrice)
    ).toFixed(2);
    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        idempotencyKey,
        dealId,
        companyId: deal.buyerCompanyId,
        provider: 'MERCADO_PAGO',
        amount,
        status: 'INITIATED',
      },
    });
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
      await this.prisma.deal.update({
        where: { id: dealId },
        data: { status: 'AWAITING_PAYMENT' },
      });
      return payment;
    } catch (error) {
      await this.prisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'FAILED',
          metadata: {
            error:
              error instanceof Error ? error.message : 'PAYMENT_PROVIDER_ERROR',
          },
        },
      });
      throw error;
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
      select: { id: true, dealId: true },
    });
    if (!transaction) return { received: true };
    await this.prisma.paymentTransaction.update({
      where: { id: payment.external_reference },
      data: {
        status,
        metadata: {
          mercadoPagoPaymentId: payment.id ?? dataId,
          mercadoPagoStatus: payment.status,
        },
        ...(status === 'PAID' ? { paidAt: new Date() } : {}),
      },
    });
    if (status === 'PAID') {
      await this.prisma.deal.update({
        where: { id: transaction.dealId },
        data: { status: 'AWAITING_PICKUP' },
      });
    }
    return { received: true };
  }

  private mapStatus(status?: string) {
    if (status === 'approved') return 'PAID' as const;
    if (status === 'cancelled') return 'CANCELLED' as const;
    if (status === 'rejected') return 'FAILED' as const;
    return 'PENDING' as const;
  }
}
