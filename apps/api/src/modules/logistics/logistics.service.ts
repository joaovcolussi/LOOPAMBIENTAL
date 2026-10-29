import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type {
  DealStatus,
  Prisma,
  ShipmentStatus,
} from '@loopambiental/database';
import { PrismaService } from '../../infrastructure/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

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

type EventInput = {
  status: string;
  description?: string;
  location?: string;
};

// Allowed forward moves of a shipment; carriers cannot go backwards.
const SHIPMENT_FLOW: Record<ShipmentStatus, ShipmentStatus[]> = {
  SCHEDULED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'DELIVERED'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

const DEFAULT_EVENT_TEXT: Record<ShipmentStatus, string> = {
  SCHEDULED: 'Coleta agendada com a transportadora',
  PICKED_UP: 'Material coletado na origem',
  IN_TRANSIT: 'Carga em trânsito',
  DELIVERED: 'Carga entregue no destino',
  CANCELLED: 'Remessa cancelada',
};

// Fictitious carriers used only by the demo quote generator.
const DEMO_CARRIERS = [
  { name: 'TransVerde Logística (demo)', factor: 1, days: 3 },
  { name: 'Rota Circular Cargas (demo)', factor: 0.86, days: 5 },
  { name: 'EcoFrete Expresso (demo)', factor: 1.24, days: 2 },
];

const shipmentSelect = {
  id: true,
  trackingCode: true,
  carrierName: true,
  status: true,
  estimatedDeliveryAt: true,
  deliveredAt: true,
  createdAt: true,
  events: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      status: true,
      description: true,
      location: true,
      createdAt: true,
    },
  },
} as const;

const requestInclude = {
  quotes: { orderBy: { amount: 'asc' as const } },
  deal: {
    select: {
      id: true,
      status: true,
      listing: { select: { title: true } },
    },
  },
  shipment: { select: shipmentSelect },
} as const;

export function demoFeaturesEnabled() {
  return process.env.DEMO_MODE !== 'false';
}

@Injectable()
export class LogisticsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  async createRequest(userId: string, input: RequestInput): Promise<unknown> {
    const deal = await this.prisma.deal.findUnique({
      where: { id: input.dealId },
      select: { buyerCompanyId: true, sellerCompanyId: true, status: true },
    });
    if (!deal) throw new NotFoundException('DEAL_NOT_FOUND');
    await this.assertDealMember(userId, deal);
    if (['COMPLETED', 'CANCELLED'].includes(deal.status))
      throw new BadRequestException('DEAL_CLOSED');
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
      include: requestInclude,
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
      take: 100,
      include: requestInclude,
    });
  }

  listAll(status?: string): Promise<unknown> {
    const allowed = [
      'REQUESTED',
      'QUOTED',
      'ACCEPTED',
      'IN_TRANSIT',
      'COMPLETED',
      'CANCELLED',
    ];
    return this.prisma.logisticsRequest.findMany({
      where:
        status && allowed.includes(status)
          ? { status: status as 'REQUESTED' }
          : {},
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        ...requestInclude,
        requestedBy: { select: { id: true, name: true } },
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
    if (!['REQUESTED', 'QUOTED'].includes(request.status))
      throw new BadRequestException('LOGISTICS_REQUEST_CLOSED');
    const amount = this.money(input.amount, 'INVALID_QUOTE_AMOUNT');
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
    await this.notifications?.create(request.requestedByUserId, {
      type: 'SHIPMENT_UPDATED',
      title: 'Nova cotação de frete',
      body: `${quote.carrierName} enviou uma cotação para sua solicitação.`,
      payload: { logisticsRequestId: requestId },
    });
    return quote;
  }

  /**
   * Demo helper: produces three fictitious carrier quotes priced by volume so
   * the whole logistics flow can be exercised without a carrier integration.
   */
  async simulateQuotes(userId: string, requestId: string): Promise<unknown> {
    if (!demoFeaturesEnabled())
      throw new ForbiddenException('DEMO_FEATURE_DISABLED');
    const request = await this.getRequestForMember(userId, requestId);
    if (!['REQUESTED', 'QUOTED'].includes(request.status))
      throw new BadRequestException('LOGISTICS_REQUEST_CLOSED');
    const existing = await this.prisma.logisticsQuote.count({
      where: { requestId },
    });
    if (existing >= DEMO_CARRIERS.length)
      return this.prisma.logisticsRequest.findUnique({
        where: { id: requestId },
        include: requestInclude,
      });
    const base = 180 + Math.min(Number(request.quantity), 50_000) * 0.12;
    await this.prisma.$transaction([
      this.prisma.logisticsQuote.createMany({
        data: DEMO_CARRIERS.map((carrier) => ({
          requestId,
          quotedByUserId: userId,
          carrierName: carrier.name,
          amount: (base * carrier.factor).toFixed(2),
          estimatedDays: carrier.days,
          notes: 'Cotação simulada para demonstração.',
        })),
      }),
      this.prisma.logisticsRequest.update({
        where: { id: requestId },
        data: { status: 'QUOTED' },
      }),
    ]);
    return this.prisma.logisticsRequest.findUnique({
      where: { id: requestId },
      include: requestInclude,
    });
  }

  async acceptQuote(userId: string, requestId: string, quoteId: string) {
    const request = await this.getRequestForMember(userId, requestId);
    if (request.status !== 'QUOTED')
      throw new BadRequestException('LOGISTICS_QUOTE_NOT_ACCEPTABLE');
    const quote = await this.prisma.logisticsQuote.findFirst({
      where: { id: quoteId, requestId, status: 'ACTIVE' },
    });
    if (!quote) throw new NotFoundException('LOGISTICS_QUOTE_NOT_FOUND');
    const estimatedDeliveryAt = quote.estimatedDays
      ? new Date(Date.now() + quote.estimatedDays * 24 * 60 * 60 * 1000)
      : null;
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.logisticsRequest.updateMany({
        where: { id: requestId, status: 'QUOTED' },
        data: { status: 'ACCEPTED' },
      });
      if (claimed.count !== 1)
        throw new ConflictException('LOGISTICS_REQUEST_CHANGED');
      await tx.logisticsQuote.updateMany({
        where: { requestId, id: { not: quoteId } },
        data: { status: 'REJECTED' },
      });
      await tx.logisticsQuote.update({
        where: { id: quoteId },
        data: { status: 'ACCEPTED' },
      });
      await tx.shipment.create({
        data: {
          logisticsRequestId: requestId,
          quoteId,
          carrierName: quote.carrierName,
          trackingCode: this.trackingCode(),
          estimatedDeliveryAt,
          events: {
            create: {
              status: 'SCHEDULED',
              description: DEFAULT_EVENT_TEXT.SCHEDULED,
              location: request.origin.slice(0, 160),
              createdByUserId: userId,
            },
          },
        },
      });
    });
    return { accepted: true, quoteId };
  }

  /** Carrier/operator update (platform staff). */
  async addShipmentEvent(
    userId: string,
    shipmentId: string,
    input: EventInput,
  ): Promise<unknown> {
    return this.advanceShipment(userId, shipmentId, input);
  }

  /** Demo helper: moves the shipment to its next natural status. */
  async simulateNextEvent(
    userId: string,
    shipmentId: string,
  ): Promise<unknown> {
    if (!demoFeaturesEnabled())
      throw new ForbiddenException('DEMO_FEATURE_DISABLED');
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: {
        status: true,
        logisticsRequest: { select: { id: true } },
      },
    });
    if (!shipment) throw new NotFoundException('SHIPMENT_NOT_FOUND');
    await this.getRequestForMember(userId, shipment.logisticsRequest.id);
    const next: Partial<Record<ShipmentStatus, ShipmentStatus>> = {
      SCHEDULED: 'PICKED_UP',
      PICKED_UP: 'IN_TRANSIT',
      IN_TRANSIT: 'DELIVERED',
    };
    const status = next[shipment.status];
    if (!status) throw new BadRequestException('SHIPMENT_FINISHED');
    return this.advanceShipment(userId, shipmentId, {
      status,
      location: status === 'IN_TRANSIT' ? 'Centro de distribuição (demo)' : '',
    });
  }

  private async advanceShipment(
    userId: string,
    shipmentId: string,
    input: EventInput,
  ) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: {
        id: true,
        status: true,
        trackingCode: true,
        logisticsRequest: {
          select: {
            id: true,
            requestedByUserId: true,
            destination: true,
            deal: { select: { id: true, status: true } },
          },
        },
      },
    });
    if (!shipment) throw new NotFoundException('SHIPMENT_NOT_FOUND');
    const status = input.status as ShipmentStatus;
    if (!(status in SHIPMENT_FLOW))
      throw new BadRequestException('INVALID_SHIPMENT_STATUS');
    if (!SHIPMENT_FLOW[shipment.status].includes(status))
      throw new BadRequestException('INVALID_SHIPMENT_TRANSITION');
    const description =
      input.description?.trim().slice(0, 240) || DEFAULT_EVENT_TEXT[status];
    const location =
      input.location?.trim().slice(0, 160) ||
      (status === 'DELIVERED' ? shipment.logisticsRequest.destination : null);
    const deal = shipment.logisticsRequest.deal;
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.shipment.updateMany({
        where: { id: shipmentId, status: shipment.status },
        data: {
          status,
          ...(status === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
        },
      });
      if (changed.count !== 1)
        throw new ConflictException('SHIPMENT_STATUS_CHANGED');
      await tx.shipmentEvent.create({
        data: {
          shipmentId,
          status,
          description,
          location: location?.slice(0, 160) ?? null,
          createdByUserId: userId,
        },
      });
      await tx.logisticsRequest.update({
        where: { id: shipment.logisticsRequest.id },
        data: {
          status:
            status === 'DELIVERED'
              ? 'COMPLETED'
              : status === 'CANCELLED'
                ? 'CANCELLED'
                : 'IN_TRANSIT',
        },
      });
      await this.syncDeal(tx, deal, status, userId);
    });
    await this.notifications?.create(
      shipment.logisticsRequest.requestedByUserId,
      {
        type: 'SHIPMENT_UPDATED',
        title: `Remessa ${shipment.trackingCode}`,
        body: description,
        payload: { shipmentId, dealId: deal.id },
      },
    );
    return this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      select: shipmentSelect,
    });
  }

  /** Keeps the deal state machine aligned with the physical shipment. */
  private async syncDeal(
    tx: Prisma.TransactionClient,
    deal: { id: string; status: DealStatus },
    shipmentStatus: ShipmentStatus,
    userId: string,
  ) {
    const transition: {
      from: DealStatus;
      to: DealStatus;
      note: string;
    } | null =
      (shipmentStatus === 'PICKED_UP' || shipmentStatus === 'IN_TRANSIT') &&
      deal.status === 'AWAITING_PICKUP'
        ? {
            from: 'AWAITING_PICKUP',
            to: 'IN_TRANSIT',
            note: 'SHIPMENT_CONFIRMED',
          }
        : shipmentStatus === 'DELIVERED' && deal.status === 'IN_TRANSIT'
          ? { from: 'IN_TRANSIT', to: 'DELIVERED', note: 'DELIVERY_CONFIRMED' }
          : null;
    if (!transition) return;
    const moved = await tx.deal.updateMany({
      where: { id: deal.id, status: transition.from },
      data: { status: transition.to },
    });
    if (moved.count === 1) {
      await tx.dealStatusHistory.create({
        data: {
          dealId: deal.id,
          fromStatus: transition.from,
          toStatus: transition.to,
          actorUserId: userId,
          note: `${transition.note}: rastreio`,
        },
      });
      deal.status = transition.to;
    }
  }

  private async getRequestForMember(userId: string, requestId: string) {
    const request = await this.prisma.logisticsRequest.findUnique({
      where: { id: requestId },
      include: {
        deal: { select: { buyerCompanyId: true, sellerCompanyId: true } },
      },
    });
    if (!request) throw new NotFoundException('LOGISTICS_REQUEST_NOT_FOUND');
    await this.assertDealMember(userId, request.deal);
    return request;
  }

  private async assertDealMember(
    userId: string,
    deal: { buyerCompanyId: string; sellerCompanyId: string },
  ) {
    const membership = await this.prisma.companyMember.findFirst({
      where: {
        userId,
        companyId: { in: [deal.buyerCompanyId, deal.sellerCompanyId] },
      },
    });
    if (!membership) throw new ForbiddenException('DEAL_ACCESS_DENIED');
  }

  private trackingCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = randomBytes(10);
    const body = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]);
    return `LA${body.join('')}BR`;
  }

  private decimal(value: string, code: string) {
    if (!/^\d+(\.\d{1,3})?$/.test(value) || Number(value) <= 0)
      throw new BadRequestException(code);
    return value;
  }

  private money(value: string, code: string) {
    if (!/^\d{1,12}(\.\d{1,2})?$/.test(value) || Number(value) <= 0)
      throw new BadRequestException(code);
    return value;
  }
}
