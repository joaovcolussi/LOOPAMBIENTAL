import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@loopambiental/database';
import { PrismaService } from '../../infrastructure/prisma.service';
import {
  AdminCursor,
  buildAdminCursorWhere,
  decodeAdminCursor,
  encodeAdminCursor,
} from './admin-pagination';

const COMPANY_STATUSES = ['ACTIVE', 'PENDING', 'BLOCKED'] as const;
const LISTING_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'PUBLISHED',
  'PAUSED',
  'NEGOTIATING',
  'CLOSED',
  'EXPIRED',
  'REJECTED',
  'ARCHIVED',
] as const;
const PLATFORM_ROLES = ['USER', 'MODERATOR', 'ADMIN'] as const;

export type PlatformSettingDefinition = {
  key: string;
  label: string;
  description: string;
  type: 'number' | 'string';
  defaultValue: number | string;
};

export const PLATFORM_SETTINGS: PlatformSettingDefinition[] = [
  {
    key: 'commission_min_percent',
    label: 'Comissão mínima (%)',
    description: 'Percentual mínimo estimado de comissão por negociação.',
    type: 'number',
    defaultValue: 5,
  },
  {
    key: 'commission_max_percent',
    label: 'Comissão máxima (%)',
    description: 'Percentual máximo estimado de comissão por negociação.',
    type: 'number',
    defaultValue: 15,
  },
  {
    key: 'support_email',
    label: 'E-mail de suporte',
    description: 'Canal exibido para solicitações de suporte.',
    type: 'string',
    defaultValue: 'contato@loopambiental.com',
  },
  {
    key: 'platform_announcement',
    label: 'Aviso da plataforma',
    description: 'Mensagem curta de aviso exibida para administradores.',
    type: 'string',
    defaultValue: '',
  },
];

function textFilter(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

@Injectable()
export class AdminResourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(params: {
    q?: string;
    status?: string;
    platformRole?: string;
    cursor?: string;
    pageSize: number;
  }) {
    const q = textFilter(params.q, 120);
    const status =
      typeof params.status === 'string' &&
      ['ACTIVE', 'PENDING', 'BLOCKED', 'DELETED'].includes(params.status)
        ? params.status
        : undefined;
    const platformRole =
      typeof params.platformRole === 'string' &&
      (PLATFORM_ROLES as readonly string[]).includes(params.platformRole)
        ? params.platformRole
        : undefined;
    const baseWhere: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(status ? { status: status as Prisma.UserWhereInput['status'] } : {}),
      ...(platformRole
        ? {
            platformRole: platformRole as Prisma.UserWhereInput['platformRole'],
          }
        : {}),
      ...(q
        ? {
            OR: [{ name: { contains: q } }, { email: { contains: q } }],
          }
        : {}),
    };
    return this.paginate({
      cursor: params.cursor,
      pageSize: params.pageSize,
      count: () => this.prisma.user.count({ where: baseWhere }),
      list: (cursor) =>
        this.prisma.user.findMany({
          where: { AND: [baseWhere, buildAdminCursorWhere(cursor)] },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: params.pageSize + 1,
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            platformRole: true,
            emailVerifiedAt: true,
            createdAt: true,
          },
        }),
      key: 'users',
    });
  }

  async listCompanies(params: {
    q?: string;
    status?: string;
    verification?: string;
    cursor?: string;
    pageSize: number;
  }) {
    const q = textFilter(params.q, 160);
    const status =
      typeof params.status === 'string' &&
      (COMPANY_STATUSES as readonly string[]).includes(params.status)
        ? (params.status as Prisma.CompanyWhereInput['status'])
        : undefined;
    const verification =
      typeof params.verification === 'string' &&
      ['UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED'].includes(
        params.verification,
      )
        ? (params.verification as Prisma.CompanyWhereInput['verification'])
        : undefined;
    const baseWhere: Prisma.CompanyWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(verification ? { verification } : {}),
      ...(q
        ? {
            OR: [
              { legalName: { contains: q } },
              { tradeName: { contains: q } },
              { city: { contains: q } },
            ],
          }
        : {}),
    };
    return this.paginate({
      cursor: params.cursor,
      pageSize: params.pageSize,
      count: () => this.prisma.company.count({ where: baseWhere }),
      list: (cursor) =>
        this.prisma.company.findMany({
          where: { AND: [baseWhere, buildAdminCursorWhere(cursor)] },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: params.pageSize + 1,
          select: {
            id: true,
            slug: true,
            legalName: true,
            tradeName: true,
            status: true,
            verification: true,
            city: true,
            state: true,
            createdAt: true,
            _count: { select: { members: true, listings: true } },
          },
        }),
      key: 'companies',
    });
  }

  async listListings(params: {
    q?: string;
    status?: string;
    type?: string;
    categoryId?: string;
    cursor?: string;
    pageSize: number;
  }) {
    const q = textFilter(params.q, 160);
    const status =
      typeof params.status === 'string' &&
      (LISTING_STATUSES as readonly string[]).includes(params.status)
        ? (params.status as Prisma.ListingWhereInput['status'])
        : undefined;
    const type =
      params.type === 'BUY' || params.type === 'SELL' ? params.type : undefined;
    const categoryId = textFilter(params.categoryId, 36);
    const baseWhere: Prisma.ListingWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(q
        ? {
            OR: [{ title: { contains: q } }, { description: { contains: q } }],
          }
        : {}),
    };
    return this.paginate({
      cursor: params.cursor,
      pageSize: params.pageSize,
      count: () => this.prisma.listing.count({ where: baseWhere }),
      list: (cursor) =>
        this.prisma.listing.findMany({
          where: { AND: [baseWhere, buildAdminCursorWhere(cursor)] },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: params.pageSize + 1,
          select: {
            id: true,
            title: true,
            slug: true,
            type: true,
            status: true,
            city: true,
            state: true,
            quantity: true,
            unit: true,
            publishedAt: true,
            createdAt: true,
            company: {
              select: { id: true, legalName: true, tradeName: true },
            },
            category: { select: { id: true, name: true, slug: true } },
          },
        }),
      key: 'listings',
    });
  }

  async listPayments(params: {
    status?: string;
    cursor?: string;
    pageSize: number;
  }) {
    const status =
      typeof params.status === 'string' &&
      [
        'INITIATED',
        'PENDING',
        'PAID',
        'FAILED',
        'CANCELLED',
        'REFUNDED',
      ].includes(params.status)
        ? (params.status as Prisma.PaymentTransactionWhereInput['status'])
        : undefined;
    const baseWhere: Prisma.PaymentTransactionWhereInput = {
      ...(status ? { status } : {}),
    };
    return this.paginate({
      cursor: params.cursor,
      pageSize: params.pageSize,
      count: () => this.prisma.paymentTransaction.count({ where: baseWhere }),
      list: (cursor) =>
        this.prisma.paymentTransaction.findMany({
          where: { AND: [baseWhere, buildAdminCursorWhere(cursor)] },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: params.pageSize + 1,
          select: {
            id: true,
            dealId: true,
            provider: true,
            externalId: true,
            amount: true,
            currency: true,
            status: true,
            paidAt: true,
            createdAt: true,
            company: {
              select: { id: true, legalName: true, tradeName: true },
            },
            deal: {
              select: {
                id: true,
                status: true,
                proposal: {
                  select: { listing: { select: { id: true, title: true } } },
                },
              },
            },
          },
        }),
      key: 'payments',
    });
  }

  async listPlans() {
    return this.prisma.plan.findMany({
      orderBy: [{ priceMonthly: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        priceMonthly: true,
        currency: true,
        features: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async listSubscriptions(params: {
    status?: string;
    cursor?: string;
    pageSize: number;
  }) {
    const status =
      typeof params.status === 'string' &&
      ['PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED'].includes(
        params.status,
      )
        ? (params.status as Prisma.SubscriptionWhereInput['status'])
        : undefined;
    const baseWhere: Prisma.SubscriptionWhereInput = {
      ...(status ? { status } : {}),
    };
    return this.paginate({
      cursor: params.cursor,
      pageSize: params.pageSize,
      count: () => this.prisma.subscription.count({ where: baseWhere }),
      list: (cursor) =>
        this.prisma.subscription.findMany({
          where: { AND: [baseWhere, buildAdminCursorWhere(cursor)] },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: params.pageSize + 1,
          select: {
            id: true,
            provider: true,
            externalId: true,
            status: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            cancelAt: true,
            cancelledAt: true,
            createdAt: true,
            company: {
              select: { id: true, legalName: true, tradeName: true },
            },
            plan: {
              select: { id: true, code: true, name: true, priceMonthly: true },
            },
          },
        }),
      key: 'subscriptions',
    });
  }

  async listAuditLogs(params: {
    action?: string;
    resourceType?: string;
    resourceId?: string;
    cursor?: string;
    pageSize: number;
  }) {
    const action = textFilter(params.action, 80);
    const resourceType = textFilter(params.resourceType, 80);
    const resourceId = textFilter(params.resourceId, 36);
    const baseWhere: Prisma.AuditLogWhereInput = {
      ...(action ? { action: { contains: action } } : {}),
      ...(resourceType ? { resourceType } : {}),
      ...(resourceId ? { resourceId } : {}),
    };
    return this.paginate({
      cursor: params.cursor,
      pageSize: params.pageSize,
      count: () => this.prisma.auditLog.count({ where: baseWhere }),
      list: (cursor) =>
        this.prisma.auditLog.findMany({
          where: { AND: [baseWhere, buildAdminCursorWhere(cursor)] },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: params.pageSize + 1,
          select: {
            id: true,
            action: true,
            resourceType: true,
            resourceId: true,
            metadata: true,
            createdAt: true,
            actor: { select: { id: true, name: true, email: true } },
          },
        }),
      key: 'auditLogs',
    });
  }

  async getSettings() {
    const stored = await this.prisma.platformSetting.findMany({
      select: {
        key: true,
        value: true,
        updatedAt: true,
        updatedBy: { select: { id: true, name: true } },
      },
    });
    const storedByKey = new Map(stored.map((item) => [item.key, item]));
    return PLATFORM_SETTINGS.map((definition) => {
      const current = storedByKey.get(definition.key);
      return {
        key: definition.key,
        label: definition.label,
        description: definition.description,
        type: definition.type,
        value: current ? current.value : definition.defaultValue,
        updatedAt: current?.updatedAt ?? null,
        updatedBy: current?.updatedBy ?? null,
      };
    });
  }

  async updateSetting(actorUserId: string, key: string, value: unknown) {
    const definition = PLATFORM_SETTINGS.find((item) => item.key === key);
    if (!definition) throw new NotFoundException('PLATFORM_SETTING_NOT_FOUND');
    const normalized = this.normalizeSetting(definition, value);
    const saved = await this.prisma.platformSetting.upsert({
      where: { key },
      create: {
        key,
        value: normalized as Prisma.InputJsonValue,
        updatedByUserId: actorUserId,
      },
      update: {
        value: normalized as Prisma.InputJsonValue,
        updatedByUserId: actorUserId,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action: 'PLATFORM_SETTING_UPDATED',
        resourceType: 'PLATFORM_SETTING',
        metadata: { key, value: normalized as Prisma.InputJsonValue },
      },
    });
    return { key: saved.key, value: saved.value, updatedAt: saved.updatedAt };
  }

  async updateCompanyStatus(
    actorUserId: string,
    companyId: string,
    status: unknown,
  ) {
    if (
      typeof status !== 'string' ||
      !(COMPANY_STATUSES as readonly string[]).includes(status)
    )
      throw new BadRequestException('INVALID_COMPANY_STATUS');
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const company = await transaction.company.update({
          where: { id: companyId },
          data: { status: status as Prisma.CompanyUpdateInput['status'] },
          select: {
            id: true,
            legalName: true,
            tradeName: true,
            status: true,
            verification: true,
          },
        });
        await transaction.auditLog.create({
          data: {
            actorUserId,
            action: 'COMPANY_STATUS_UPDATED',
            resourceType: 'COMPANY',
            resourceId: companyId,
            metadata: { status },
          },
        });
        return company;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      )
        throw new NotFoundException('COMPANY_NOT_FOUND');
      throw error;
    }
  }

  async takeDownListing(
    actorUserId: string,
    listingId: string,
    reason: unknown,
  ) {
    const normalizedReason =
      typeof reason === 'string' && reason.trim().length >= 3
        ? reason.trim().slice(0, 240)
        : 'ADMIN_TAKE_DOWN';
    return this.prisma.$transaction(async (transaction) => {
      const listing = await transaction.listing.findFirst({
        where: { id: listingId, deletedAt: null },
        select: { id: true, status: true, title: true },
      });
      if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');
      if (listing.status === 'ARCHIVED')
        throw new ConflictException('LISTING_ALREADY_ARCHIVED');
      const updated = await transaction.listing.update({
        where: { id: listingId },
        data: { status: 'ARCHIVED', publishedAt: null },
        select: { id: true, title: true, status: true },
      });
      await transaction.listingStatusHistory.create({
        data: {
          listingId,
          fromStatus: listing.status,
          toStatus: 'ARCHIVED',
          actorUserId,
          reason: normalizedReason,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorUserId,
          action: 'LISTING_TAKEN_DOWN',
          resourceType: 'LISTING',
          resourceId: listingId,
          metadata: { reason: normalizedReason, fromStatus: listing.status },
        },
      });
      return updated;
    });
  }

  private normalizeSetting(
    definition: PlatformSettingDefinition,
    value: unknown,
  ) {
    if (definition.type === 'number') {
      const numeric =
        typeof value === 'number' ? value : Number(value as string);
      if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100)
        throw new BadRequestException('INVALID_SETTING_VALUE');
      if (definition.key.startsWith('commission_')) return numeric;
      return numeric;
    }
    if (typeof value !== 'string')
      throw new BadRequestException('INVALID_SETTING_VALUE');
    const trimmed = value.trim().slice(0, 500);
    if (definition.key === 'support_email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed))
        throw new BadRequestException('INVALID_SETTING_VALUE');
    }
    return trimmed;
  }

  private async paginate<T extends { id: string; createdAt: Date }>(input: {
    cursor?: string;
    pageSize: number;
    count: () => Promise<number>;
    list: (cursor: AdminCursor | null) => Promise<T[]>;
    key: string;
  }) {
    const cursor = decodeAdminCursor(input.cursor);
    if (input.cursor && !cursor)
      throw new BadRequestException('INVALID_ADMIN_CURSOR');
    const [rows, total] = await Promise.all([
      input.list(cursor),
      input.count(),
    ]);
    const hasMore = rows.length > input.pageSize;
    const items = hasMore ? rows.slice(0, input.pageSize) : rows;
    const last = items[items.length - 1];
    return {
      [input.key]: items,
      pagination: {
        pageSize: input.pageSize,
        total,
        hasMore,
        nextCursor: hasMore && last ? encodeAdminCursor(last) : null,
      },
    };
  }
}
