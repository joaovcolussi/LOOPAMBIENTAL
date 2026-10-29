import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { DealStatus, Prisma } from '@loopambiental/database';
import { PrismaService } from '../../infrastructure/prisma.service';
import { OutboxService } from '../../infrastructure/outbox.service';
import { NotificationsService } from '../notifications/notifications.service';

export type DealSide = 'BUYER' | 'SELLER';

type TransitionDefinition = {
  from: readonly DealStatus[];
  to: DealStatus;
  // Which side of the deal may trigger the transition.
  actor: DealSide | 'ANY';
  note: string;
  requiresReason?: boolean;
  title: string;
};

/**
 * Explicit deal state machine. There is intentionally no generic "set
 * status" command: each action names one allowed transition.
 */
export const DEAL_TRANSITIONS = {
  'request-documents': {
    from: ['OPEN'],
    to: 'AWAITING_DOCUMENTS',
    actor: 'ANY',
    note: 'DOCUMENTS_REQUESTED',
    title: 'Documentos solicitados na negociação',
  },
  'confirm-documents': {
    from: ['AWAITING_DOCUMENTS'],
    to: 'AWAITING_PAYMENT',
    actor: 'BUYER',
    note: 'DOCUMENTS_CONFIRMED',
    title: 'Documentação confirmada pelo comprador',
  },
  'confirm-shipment': {
    from: ['AWAITING_PICKUP'],
    to: 'IN_TRANSIT',
    actor: 'SELLER',
    note: 'SHIPMENT_CONFIRMED',
    title: 'Material coletado e em trânsito',
  },
  'confirm-delivery': {
    from: ['IN_TRANSIT'],
    to: 'DELIVERED',
    actor: 'BUYER',
    note: 'DELIVERY_CONFIRMED',
    title: 'Entrega confirmada pelo comprador',
  },
  complete: {
    from: ['DELIVERED'],
    to: 'COMPLETED',
    actor: 'BUYER',
    note: 'DEAL_COMPLETED',
    title: 'Negociação concluída',
  },
  dispute: {
    from: ['AWAITING_PICKUP', 'IN_TRANSIT', 'DELIVERED'],
    to: 'DISPUTED',
    actor: 'ANY',
    note: 'DISPUTE_OPENED',
    requiresReason: true,
    title: 'Disputa aberta na negociação',
  },
  cancel: {
    from: ['OPEN', 'AWAITING_DOCUMENTS', 'AWAITING_PAYMENT'],
    to: 'CANCELLED',
    actor: 'ANY',
    note: 'DEAL_CANCELLED',
    requiresReason: true,
    title: 'Negociação cancelada',
  },
} as const satisfies Record<string, TransitionDefinition>;

export type DealAction = keyof typeof DEAL_TRANSITIONS;

export const ADMIN_DISPUTE_RESOLUTIONS = {
  complete: 'COMPLETED',
  cancel: 'CANCELLED',
} as const;

const ACTIVE_DEAL_STATUSES: DealStatus[] = [
  'OPEN',
  'AWAITING_DOCUMENTS',
  'AWAITING_PAYMENT',
  'AWAITING_PICKUP',
  'IN_TRANSIT',
  'DELIVERED',
  'DISPUTED',
];

const companySummary = {
  select: { id: true, legalName: true, tradeName: true, slug: true },
} as const;

const dealSummarySelect = {
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  buyerCompanyId: true,
  sellerCompanyId: true,
  listing: {
    select: { id: true, title: true, slug: true, unit: true, type: true },
  },
  proposal: {
    select: { id: true, quantity: true, unitPrice: true, currency: true },
  },
  buyerCompany: companySummary,
  sellerCompany: companySummary,
} as const;

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly notifications: NotificationsService,
  ) {}

  async list(
    userId: string,
    options: { status?: string; cursor?: string; pageSize?: number } = {},
  ): Promise<unknown> {
    const pageSize = Math.min(Math.max(options.pageSize ?? 20, 1), 50);
    const status = this.parseStatusFilter(options.status);
    let cursorWhere: Prisma.DealWhereInput = {};
    if (options.cursor) {
      const anchor = await this.prisma.deal.findUnique({
        where: { id: options.cursor },
        select: { id: true, createdAt: true },
      });
      if (!anchor) throw new BadRequestException('INVALID_CURSOR');
      cursorWhere = {
        OR: [
          { createdAt: { lt: anchor.createdAt } },
          { createdAt: anchor.createdAt, id: { lt: anchor.id } },
        ],
      };
    }
    const where: Prisma.DealWhereInput = {
      AND: [
        this.memberOfEitherSide(userId),
        status ? { status: { in: status } } : {},
        cursorWhere,
      ],
    };
    const [rows, totals] = await Promise.all([
      this.prisma.deal.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pageSize + 1,
        select: dealSummarySelect,
      }),
      this.prisma.deal.groupBy({
        by: ['status'],
        where: this.memberOfEitherSide(userId),
        _count: { _all: true },
      }),
    ]);
    const companyIds = await this.memberCompanyIds(userId);
    const hasMore = rows.length > pageSize;
    const items = hasMore ? rows.slice(0, pageSize) : rows;
    return {
      deals: items.map((deal) => ({
        ...deal,
        side: companyIds.has(deal.buyerCompanyId) ? 'BUYER' : 'SELLER',
      })),
      countsByStatus: Object.fromEntries(
        totals.map((row) => [row.status, row._count._all]),
      ),
      pagination: {
        pageSize,
        hasMore,
        nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
      },
    };
  }

  async get(userId: string, id: string): Promise<unknown> {
    const deal = await this.prisma.deal.findFirst({
      where: { id, ...this.memberOfEitherSide(userId) },
      select: {
        ...dealSummarySelect,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            note: true,
            createdAt: true,
            actor: { select: { id: true, name: true } },
          },
        },
        paymentTransactions: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            provider: true,
            checkoutUrl: true,
            paidAt: true,
            createdAt: true,
          },
        },
        logisticsRequests: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            origin: true,
            destination: true,
            createdAt: true,
            shipment: {
              select: { id: true, trackingCode: true, status: true },
            },
          },
        },
        conversation: { select: { id: true } },
        reviews: {
          select: { id: true, authorCompanyId: true, rating: true },
        },
      },
    });
    if (!deal) throw new NotFoundException('DEAL_NOT_FOUND');
    const companyIds = await this.memberCompanyIds(userId);
    const side: DealSide = companyIds.has(deal.buyerCompanyId)
      ? 'BUYER'
      : 'SELLER';
    return {
      ...deal,
      side,
      availableActions: this.availableActions(deal.status, side),
    };
  }

  async transition(
    userId: string,
    id: string,
    action: string,
    reason?: string,
  ): Promise<unknown> {
    if (!(action in DEAL_TRANSITIONS))
      throw new BadRequestException('INVALID_DEAL_ACTION');
    const definition: TransitionDefinition =
      DEAL_TRANSITIONS[action as DealAction];
    const normalizedReason = reason?.trim().slice(0, 200) || undefined;
    if (definition.requiresReason && !normalizedReason)
      throw new BadRequestException('DEAL_REASON_REQUIRED');
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        listingId: true,
        buyerCompanyId: true,
        sellerCompanyId: true,
        proposal: { select: { quantity: true } },
      },
    });
    if (!deal) throw new NotFoundException('DEAL_NOT_FOUND');
    const companyIds = await this.memberCompanyIds(userId);
    const isBuyer = companyIds.has(deal.buyerCompanyId);
    const isSeller = companyIds.has(deal.sellerCompanyId);
    if (!isBuyer && !isSeller) throw new NotFoundException('DEAL_NOT_FOUND');
    if (
      (definition.actor === 'BUYER' && !isBuyer) ||
      (definition.actor === 'SELLER' && !isSeller)
    )
      throw new ForbiddenException('DEAL_ACTION_NOT_ALLOWED');
    if (!definition.from.includes(deal.status))
      throw new BadRequestException('INVALID_DEAL_TRANSITION');
    if (action === 'cancel') {
      const paid = await this.prisma.paymentTransaction.findFirst({
        where: { dealId: id, status: 'PAID' },
        select: { id: true },
      });
      if (paid) throw new BadRequestException('DEAL_ALREADY_PAID');
    }

    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.deal.updateMany({
        where: { id, status: deal.status },
        data: { status: definition.to },
      });
      if (changed.count !== 1)
        throw new ConflictException('DEAL_STATUS_CHANGED');
      await tx.dealStatusHistory.create({
        data: {
          dealId: id,
          fromStatus: deal.status,
          toStatus: definition.to,
          actorUserId: userId,
          note: normalizedReason
            ? `${definition.note}: ${normalizedReason}`.slice(0, 200)
            : definition.note,
        },
      });
      if (definition.to === 'CANCELLED') {
        await tx.paymentTransaction.updateMany({
          where: { dealId: id, status: { in: ['INITIATED', 'PENDING'] } },
          data: { status: 'CANCELLED' },
        });
        await this.releaseListing(tx, deal, userId, true);
      }
      if (definition.to === 'COMPLETED')
        await this.releaseListing(tx, deal, userId, false);
      await this.outbox.enqueueWithin(tx, {
        type: 'deal.status.changed',
        aggregateType: 'DEAL',
        aggregateId: id,
        payload: { dealId: id, from: deal.status, to: definition.to },
      });
    });

    await this.notifyCounterpart(
      isBuyer ? deal.sellerCompanyId : deal.buyerCompanyId,
      definition.title,
      id,
    );
    return this.get(userId, id);
  }

  /** Platform staff closes a dispute in favour of completion or cancellation. */
  async resolveDispute(
    actorUserId: string,
    id: string,
    resolution: string,
    notes?: string,
  ): Promise<unknown> {
    if (!(resolution in ADMIN_DISPUTE_RESOLUTIONS))
      throw new BadRequestException('INVALID_DISPUTE_RESOLUTION');
    const to =
      ADMIN_DISPUTE_RESOLUTIONS[
        resolution as keyof typeof ADMIN_DISPUTE_RESOLUTIONS
      ];
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        listingId: true,
        buyerCompanyId: true,
        sellerCompanyId: true,
        proposal: { select: { quantity: true } },
      },
    });
    if (!deal) throw new NotFoundException('DEAL_NOT_FOUND');
    if (deal.status !== 'DISPUTED')
      throw new BadRequestException('INVALID_DEAL_TRANSITION');
    const note = `DISPUTE_RESOLVED_${to}${notes?.trim() ? `: ${notes.trim()}` : ''}`;
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.deal.updateMany({
        where: { id, status: 'DISPUTED' },
        data: { status: to },
      });
      if (changed.count !== 1)
        throw new ConflictException('DEAL_STATUS_CHANGED');
      await tx.dealStatusHistory.create({
        data: {
          dealId: id,
          fromStatus: 'DISPUTED',
          toStatus: to,
          actorUserId,
          note: note.slice(0, 200),
        },
      });
      await this.releaseListing(tx, deal, actorUserId, to === 'CANCELLED');
      await tx.auditLog.create({
        data: {
          actorUserId,
          action: 'DEAL_DISPUTE_RESOLVED',
          resourceType: 'DEAL',
          resourceId: id,
          metadata: { resolution: to, notes: notes?.trim().slice(0, 300) },
        },
      });
    });
    await Promise.all([
      this.notifyCounterpart(deal.buyerCompanyId, 'Disputa resolvida', id),
      this.notifyCounterpart(deal.sellerCompanyId, 'Disputa resolvida', id),
    ]);
    return { id, status: to };
  }

  listDisputes(): Promise<unknown> {
    return this.prisma.deal.findMany({
      where: { status: 'DISPUTED' },
      orderBy: { updatedAt: 'asc' },
      take: 100,
      select: {
        ...dealSummarySelect,
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { note: true, createdAt: true },
        },
      },
    });
  }

  availableActions(status: DealStatus, side: DealSide): DealAction[] {
    return (Object.keys(DEAL_TRANSITIONS) as DealAction[]).filter((action) => {
      const definition: TransitionDefinition = DEAL_TRANSITIONS[action];
      return (
        definition.from.includes(status) &&
        (definition.actor === 'ANY' || definition.actor === side)
      );
    });
  }

  /**
   * Returns reserved stock to the listing on cancellation and reopens it (or
   * closes it when sold out) once no other active deal holds it.
   */
  private async releaseListing(
    tx: Prisma.TransactionClient,
    deal: { id: string; listingId: string; proposal: { quantity: unknown } },
    actorUserId: string,
    restoreQuantity: boolean,
  ) {
    if (restoreQuantity)
      await tx.listing.update({
        where: { id: deal.listingId },
        data: {
          availableQuantity: {
            increment: deal.proposal.quantity as Prisma.Decimal,
          },
        },
      });
    const otherActive = await tx.deal.count({
      where: {
        listingId: deal.listingId,
        id: { not: deal.id },
        status: { in: ACTIVE_DEAL_STATUSES },
      },
    });
    if (otherActive > 0) return;
    const listing = await tx.listing.findUnique({
      where: { id: deal.listingId },
      select: { status: true, availableQuantity: true },
    });
    if (!listing || listing.status !== 'NEGOTIATING') return;
    const soldOut = Number(listing.availableQuantity) <= 0;
    const toStatus = soldOut ? 'CLOSED' : 'PUBLISHED';
    await tx.listing.update({
      where: { id: deal.listingId },
      data: { status: toStatus },
    });
    await tx.listingStatusHistory.create({
      data: {
        listingId: deal.listingId,
        fromStatus: 'NEGOTIATING',
        toStatus,
        actorUserId,
        reason: soldOut ? 'DEAL_COMPLETED_SOLD_OUT' : 'DEAL_RELEASED',
      },
    });
  }

  private async notifyCounterpart(
    companyId: string,
    title: string,
    dealId: string,
  ) {
    const members = await this.prisma.companyMember.findMany({
      where: { companyId },
      select: { userId: true },
      take: 50,
    });
    await Promise.all(
      members.map((member) =>
        this.notifications.create(member.userId, {
          type: 'SYSTEM',
          title,
          body: 'Acompanhe a atualização em Negociações.',
          payload: { dealId },
        }),
      ),
    );
  }

  private async memberCompanyIds(userId: string) {
    const memberships = await this.prisma.companyMember.findMany({
      where: { userId },
      select: { companyId: true },
    });
    return new Set(memberships.map((membership) => membership.companyId));
  }

  private memberOfEitherSide(userId: string): Prisma.DealWhereInput {
    return {
      OR: [
        { buyerCompany: { members: { some: { userId } } } },
        { sellerCompany: { members: { some: { userId } } } },
      ],
    };
  }

  private parseStatusFilter(value?: string): DealStatus[] | null {
    if (!value) return null;
    if (value === 'active') return ACTIVE_DEAL_STATUSES;
    if (value === 'closed') return ['COMPLETED', 'CANCELLED'];
    const allowed = [...ACTIVE_DEAL_STATUSES, 'COMPLETED', 'CANCELLED'];
    if (!allowed.includes(value as DealStatus))
      throw new BadRequestException('INVALID_DEAL_STATUS');
    return [value as DealStatus];
  }
}
