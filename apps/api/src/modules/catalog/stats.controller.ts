import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getPublicStats() {
    const [
      total,
      buy,
      sell,
      verifiedCompanies,
      categories,
      listingsByCategory,
    ] = await Promise.all([
      this.prisma.listing.count({
        where: { status: 'PUBLISHED', deletedAt: null },
      }),
      this.prisma.listing.count({
        where: { status: 'PUBLISHED', deletedAt: null, type: 'BUY' },
      }),
      this.prisma.listing.count({
        where: { status: 'PUBLISHED', deletedAt: null, type: 'SELL' },
      }),
      this.prisma.company.count({
        where: { deletedAt: null, verification: 'VERIFIED' },
      }),
      this.prisma.wasteCategory.findMany({
        where: { parentId: null },
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.listing.groupBy({
        by: ['categoryId'],
        where: { status: 'PUBLISHED', deletedAt: null },
        _count: { _all: true },
      }),
    ]);

    const demandByCategory = categories
      .map((category) => {
        const count =
          listingsByCategory.find((item) => item.categoryId === category.id)
            ?._count._all ?? 0;
        return {
          id: category.id,
          name: category.name,
          slug: category.slug,
          listings: count,
        };
      })
      .sort((left, right) => right.listings - left.listings);

    return {
      totalListings: total,
      buyListings: buy,
      sellListings: sell,
      verifiedCompanies,
      demandByCategory,
    };
  }
}
