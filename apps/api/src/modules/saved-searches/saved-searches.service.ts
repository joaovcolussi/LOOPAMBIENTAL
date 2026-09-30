import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@loopambiental/database';
import { PrismaService } from '../../infrastructure/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  buildPublishedListingWhere,
  normalizeListingFilters,
} from '../listings/listing-filter';

export type SavedSearchFrequencyValue = 'NONE' | 'DAILY' | 'WEEKLY';

const FREQUENCIES: SavedSearchFrequencyValue[] = ['NONE', 'DAILY', 'WEEKLY'];
const DAY_MS = 24 * 60 * 60 * 1000;
const ALERT_INTERVAL_MS = 60 * 60 * 1000;

const savedSearchSelect = {
  id: true,
  name: true,
  filters: true,
  frequency: true,
  isActive: true,
  lastProcessedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class SavedSearchesService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    const timer = setInterval(() => {
      void this.runDueAlerts().catch(() => undefined);
    }, ALERT_INTERVAL_MS);
    timer.unref?.();
  }

  async create(
    userId: string,
    input: { name?: unknown; filters?: unknown; frequency?: unknown },
  ) {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (name.length < 2 || name.length > 120)
      throw new BadRequestException('INVALID_SAVED_SEARCH_NAME');
    const frequency = this.parseFrequency(input.frequency);
    const filters = this.parseFilters(input.filters);
    if (Object.keys(filters).length === 0)
      throw new BadRequestException('SAVED_SEARCH_FILTERS_REQUIRED');
    return this.prisma.savedSearch.create({
      data: {
        userId,
        name,
        frequency,
        filters: filters as Prisma.InputJsonValue,
        lastProcessedAt: new Date(),
      },
      select: savedSearchSelect,
    });
  }

  list(userId: string) {
    return this.prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: savedSearchSelect,
    });
  }

  async update(
    userId: string,
    id: string,
    input: {
      name?: unknown;
      filters?: unknown;
      frequency?: unknown;
      isActive?: unknown;
    },
  ) {
    await this.getOwned(userId, id);
    const data: Record<string, unknown> = {};
    if (input.name !== undefined) {
      const name = typeof input.name === 'string' ? input.name.trim() : '';
      if (name.length < 2 || name.length > 120)
        throw new BadRequestException('INVALID_SAVED_SEARCH_NAME');
      data.name = name;
    }
    if (input.filters !== undefined) {
      const filters = this.parseFilters(input.filters);
      if (Object.keys(filters).length === 0)
        throw new BadRequestException('SAVED_SEARCH_FILTERS_REQUIRED');
      data.filters = filters as Prisma.InputJsonValue;
    }
    if (input.frequency !== undefined)
      data.frequency = this.parseFrequency(input.frequency);
    if (typeof input.isActive === 'boolean') data.isActive = input.isActive;
    return this.prisma.savedSearch.update({
      where: { id },
      data,
      select: savedSearchSelect,
    });
  }

  async remove(userId: string, id: string) {
    await this.getOwned(userId, id);
    await this.prisma.savedSearch.delete({ where: { id } });
    return { id, removed: true };
  }

  async results(userId: string, id: string, pageValue: number) {
    const savedSearch = await this.getOwned(userId, id);
    const filters = normalizeListingFilters(
      (savedSearch.filters ?? {}) as Record<string, unknown>,
    );
    const page = Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1;
    const pageSize = 12;
    const where = buildPublishedListingWhere(filters);
    const [items, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, title: true, slug: true },
      }),
      this.prisma.listing.count({ where }),
    ]);
    return {
      data: items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async runDueAlerts(force = false) {
    const searches = await this.prisma.savedSearch.findMany({
      where: { isActive: true, frequency: { in: ['DAILY', 'WEEKLY'] } },
      select: {
        id: true,
        userId: true,
        name: true,
        filters: true,
        frequency: true,
        lastProcessedAt: true,
        createdAt: true,
      },
    });
    const now = new Date();
    let processed = 0;
    let notified = 0;
    for (const search of searches) {
      const since = search.lastProcessedAt ?? search.createdAt;
      const windowMs = search.frequency === 'WEEKLY' ? 7 * DAY_MS : DAY_MS;
      if (!force && now.getTime() - since.getTime() < windowMs) continue;
      const filters = normalizeListingFilters(
        (search.filters ?? {}) as Record<string, unknown>,
      );
      const matches = await this.prisma.listing.findMany({
        where: {
          ...buildPublishedListingWhere(filters),
          publishedAt: { gt: since },
        },
        orderBy: { publishedAt: 'desc' },
        take: 20,
        select: { id: true, title: true },
      });
      processed += 1;
      if (matches.length > 0) {
        await this.notifications.create(search.userId, {
          type: 'SAVED_SEARCH_MATCH',
          title: `Novos anúncios em "${search.name}"`,
          body: `${matches.length} novo(s) anúncio(s) correspondem à sua busca salva.`,
          payload: { savedSearchId: search.id, listingId: matches[0].id },
        });
        notified += 1;
      }
      await this.prisma.savedSearch.update({
        where: { id: search.id },
        data: { lastProcessedAt: now },
      });
    }
    return { processed, notified };
  }

  private async getOwned(userId: string, id: string) {
    const savedSearch = await this.prisma.savedSearch.findFirst({
      where: { id, userId },
    });
    if (!savedSearch) throw new NotFoundException('SAVED_SEARCH_NOT_FOUND');
    return savedSearch;
  }

  private parseFrequency(value: unknown): SavedSearchFrequencyValue {
    const frequency = typeof value === 'string' ? value : 'DAILY';
    if (!FREQUENCIES.includes(frequency as SavedSearchFrequencyValue))
      throw new BadRequestException('INVALID_SAVED_SEARCH_FREQUENCY');
    return frequency as SavedSearchFrequencyValue;
  }

  private parseFilters(value: unknown) {
    const record =
      value && typeof value === 'object'
        ? (value as Record<string, unknown>)
        : {};
    return normalizeListingFilters(record);
  }
}
