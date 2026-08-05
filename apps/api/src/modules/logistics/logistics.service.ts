import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';

type RequestInput = {
  dealId: string;
  origin: string;
  destination: string;
  quantity: string;
  unit: string;
  pickupWindow?: string;
  requirements?: string;
};

type QuoteInput = {
  carrierName: string;
  amount: string;
  estimatedDays?: number;
  notes?: string;
};

@Injectable()
export class LogisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async createRequest(userId: string, input: RequestInput): Promise<unknown> {
    const deal = await this.prisma.deal.findUnique({
      where: { id: input.dealId },
      select: { buyerCompanyId: true, sellerCompanyId: true },
    });
    if (!deal) throw new NotFoundException('DEAL_NOT_FOUND');
    const membership = await this.prisma.companyMember.findFirst({
      where: {
        userId,
        companyId: { in: [deal.buyerCompanyId, deal.sellerCompanyId] },
      },
    });
    if (!membership) throw new ForbiddenException('DEAL_ACCESS_DENIED');
    const quantity = this.decimal(input.quantity, 'INVALID_QUANTITY');
    if (!input.origin.trim() || !input.destination.trim())
      throw new BadRequestException('LOGISTICS_LOCATIONS_REQUIRED');
    return this.prisma.logisticsRequest.create({
      data: {
        dealId: input.dealId,
        requestedByUserId: userId,
        origin: input.origin.trim().slice(0, 300),
        destination: input.destination.trim().slice(0, 300),
        quantity,
        unit: input.unit.trim().slice(0, 20),
        pickupWindow: input.pickupWindow?.trim().slice(0, 160),
        requirements: input.requirements?.trim().slice(0, 5000),
      },
      include: { quotes: true },
    });
  }

  listForUser(userId: string): Promise<unknown> {
    return this.prisma.logisticsRequest.findMany({
      where: {
        deal: {
          OR: [
            { buyerCompany: { members: { some: { userId } } } },
            { sellerCompany: { members: { some: { userId } } } },
          ],
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        quotes: { orderBy: { amount: 'asc' } },
        deal: { select: { id: true } },
      },
    });
  }

  async addQuote(
    userId: string,
    requestId: string,
    input: QuoteInput,
  ): Promise<unknown> {
    const request = await this.prisma.logisticsRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new NotFoundException('LOGISTICS_REQUEST_NOT_FOUND');
    const amount = this.decimal(input.amount, 'INVALID_QUOTE_AMOUNT');
    if (!input.carrierName.trim())
      throw new BadRequestException('CARRIER_REQUIRED');
    const quote = await this.prisma.logisticsQuote.create({
      data: {
        requestId,
        quotedByUserId: userId,
        carrierName: input.carrierName.trim().slice(0, 200),
        amount,
        estimatedDays: input.estimatedDays,
        notes: input.notes?.trim().slice(0, 5000),
      },
    });
    await this.prisma.logisticsRequest.update({
      where: { id: requestId },
      data: { status: 'QUOTED' },
    });
    return quote;
  }

  async acceptQuote(userId: string, requestId: string, quoteId: string) {
    const request = await this.prisma.logisticsRequest.findUnique({
      where: { id: requestId },
      include: { deal: true },
    });
    if (!request) throw new NotFoundException('LOGISTICS_REQUEST_NOT_FOUND');
    const membership = await this.prisma.companyMember.findFirst({
      where: {
        userId,
        companyId: {
          in: [request.deal.buyerCompanyId, request.deal.sellerCompanyId],
        },
      },
    });
    if (!membership) throw new ForbiddenException('DEAL_ACCESS_DENIED');
    const quote = await this.prisma.logisticsQuote.findFirst({
      where: { id: quoteId, requestId },
    });
    if (!quote) throw new NotFoundException('LOGISTICS_QUOTE_NOT_FOUND');
    await this.prisma.$transaction([
      this.prisma.logisticsQuote.updateMany({
        where: { requestId, id: { not: quoteId } },
        data: { status: 'REJECTED' },
      }),
      this.prisma.logisticsQuote.update({
        where: { id: quoteId },
        data: { status: 'ACCEPTED' },
      }),
      this.prisma.logisticsRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' },
      }),
    ]);
    return { accepted: true, quoteId };
  }

  private decimal(value: string, code: string) {
    if (!/^\d+(\.\d{1,3})?$/.test(value) || Number(value) <= 0)
      throw new BadRequestException(code);
    return value;
  }
}
