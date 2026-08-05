import { Controller, Get, Param, Query } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import { ListingsService } from './listings.service';

const MAX_PAGE_SIZE = 50;

type ListingListResponse = {
  data: unknown[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

@Controller('listings')
export class ListingsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly listingsService: ListingsService,
  ) {}

  @Get(':slug')
  async findOne(@Param('slug') slug: string): Promise<{ listing: unknown }> {
    return { listing: await this.listingsService.findPublishedBySlug(slug) };
  }

  @Get()
  async findPublished(
    @Query('page') pageValue?: string,
    @Query('pageSize') pageSizeValue?: string,
    @Query('q') query?: string,
    @Query('type') type?: 'BUY' | 'SELL',
    @Query('categoryId') categoryId?: string,
    @Query('state') state?: string,
  ): Promise<ListingListResponse> {
    const page = this.parsePositiveInteger(pageValue, 1);
    const pageSize = Math.min(
      this.parsePositiveInteger(pageSizeValue, 12),
      MAX_PAGE_SIZE,
    );
    const where = {
      status: 'PUBLISHED' as const,
      deletedAt: null,
      ...(type === 'BUY' || type === 'SELL' ? { type } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(state ? { state: state.toUpperCase() } : {}),
      ...(query?.trim()
        ? {
            OR: [
              {
                title: { contains: query.trim() },
              },
              {
                description: {
                  contains: query.trim(),
                },
              },
              {
                city: { contains: query.trim() },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.listing.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          type: true,
          title: true,
          slug: true,
          quantity: true,
          availableQuantity: true,
          unit: true,
          unitPrice: true,
          currency: true,
          frequency: true,
          riskClassification: true,
          originDetails: true,
          ownTransport: true,
          requiresDocuments: true,
          city: true,
          state: true,
          publishedAt: true,
          createdAt: true,
          lastAccessAt: true,
          company: {
            select: {
              id: true,
              tradeName: true,
              legalName: true,
              verification: true,
            },
          },
          createdBy: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, slug: true } },
          material: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.listing.count({ where }),
    ]);
    const lastAccessAt = new Date();
    if (items.length) {
      await this.prisma.listing.updateMany({
        where: { id: { in: items.map((item) => item.id) } },
        data: { lastAccessAt },
      });
    }

    return {
      data: items.map((item) => ({ ...item, lastAccessAt })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  private parsePositiveInteger(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
