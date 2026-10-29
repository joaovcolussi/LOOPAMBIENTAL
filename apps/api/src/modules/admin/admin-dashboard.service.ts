import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@loopambiental/database';
import { PrismaService } from '../../infrastructure/prisma.service';

type DemandRow = {
  id: string;
  name: string;
  listings: bigint | number;
  proposals: bigint | number | string;
};
type ValueRow = {
  gross: string | number | null;
  pipeline: string | number | null;
  accepted: bigint | number | string | null;
  total: bigint | number;
};

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const [
      users,
      companies,
      listingStatuses,
      listingTypes,
      proposalStatuses,
      dealStatuses,
      demandRows,
      valueRows,
      openModeration,
      verifiedCompanies,
      usersByStatus,
      commissionSettings,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.company.count({ where: { deletedAt: null } }),
      this.prisma.listing.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.listing.groupBy({
        by: ['type'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.proposal.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.deal.groupBy({ by: ['status'], _count: { _all: true } }),
      // Aggregated in the database instead of loading every listing.
      this.prisma.$queryRaw<DemandRow[]>(Prisma.sql`
        SELECT c.id AS id, c.name AS name,
               COUNT(l.id) AS listings,
               COALESCE(SUM(p.total), 0) AS proposals
        FROM listings l
        JOIN waste_categories c ON c.id = l.category_id
        LEFT JOIN (
          SELECT listing_id, COUNT(*) AS total FROM proposals GROUP BY listing_id
        ) p ON p.listing_id = l.id
        WHERE l.status = 'PUBLISHED' AND l.deleted_at IS NULL
        GROUP BY c.id, c.name
      `),
      this.prisma.$queryRaw<ValueRow[]>(Prisma.sql`
        SELECT
          COALESCE(SUM(CASE WHEN status = 'ACCEPTED' THEN quantity * unit_price END), 0) AS gross,
          COALESCE(SUM(CASE WHEN status IN ('PENDING', 'COUNTERED', 'ACCEPTED') THEN quantity * unit_price END), 0) AS pipeline,
          SUM(CASE WHEN status = 'ACCEPTED' THEN 1 ELSE 0 END) AS accepted,
          COUNT(*) AS total
        FROM proposals
      `),
      this.prisma.moderationCase.count({
        where: { status: { in: ['OPEN', 'IN_REVIEW'] } },
      }),
      this.prisma.company.count({
        where: { deletedAt: null, verification: 'VERIFIED' },
      }),
      this.prisma.user.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.platformSetting.findMany({
        where: {
          key: { in: ['commission_min_percent', 'commission_max_percent'] },
        },
        select: { key: true, value: true },
      }),
    ]);

    const values = valueRows[0];
    const grossValue = Number(values?.gross ?? 0);
    const pipelineValue = Number(values?.pipeline ?? 0);
    const acceptedProposals = Number(values?.accepted ?? 0);
    const totalProposals = Number(values?.total ?? 0);
    const percent = (key: string, fallback: number) => {
      const value = commissionSettings.find((item) => item.key === key)?.value;
      return typeof value === 'number' ? value / 100 : fallback;
    };
    const activeDeals = dealStatuses
      .filter((item) => !['COMPLETED', 'CANCELLED'].includes(item.status))
      .reduce((total, item) => total + item._count._all, 0);
    const publishedListings =
      listingStatuses.find((item) => item.status === 'PUBLISHED')?._count
        ._all ?? 0;

    return {
      generatedAt: new Date().toISOString(),
      kpis: {
        users,
        companies,
        verifiedCompanies,
        totalProposals,
        activeDeals,
        publishedListings,
        acceptedDeals:
          dealStatuses.find((item) => item.status === 'COMPLETED')?._count
            ._all ?? 0,
        openModeration,
        grossTransactionValue: grossValue,
        estimatedCommissionMin:
          grossValue * percent('commission_min_percent', 0.05),
        estimatedCommissionMax:
          grossValue * percent('commission_max_percent', 0.15),
        pipelineValue,
        conversionRate:
          totalProposals === 0 ? 0 : (acceptedProposals / totalProposals) * 100,
      },
      usersByStatus: usersByStatus.map((item) => ({
        status: item.status,
        total: item._count._all,
      })),
      listingsByStatus: listingStatuses.map((item) => ({
        status: item.status,
        total: item._count._all,
      })),
      listingsByType: listingTypes.map((item) => ({
        type: item.type,
        total: item._count._all,
      })),
      proposalsByStatus: proposalStatuses.map((item) => ({
        status: item.status,
        total: item._count._all,
      })),
      dealsByStatus: dealStatuses.map((item) => ({
        status: item.status,
        total: item._count._all,
      })),
      demandByCategory: demandRows
        .map((row) => ({
          category: row.name,
          id: row.id,
          listings: Number(row.listings),
          proposals: Number(row.proposals),
        }))
        .sort((left, right) => right.proposals - left.proposals),
    };
  }

  listUsers() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        platformRole: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async updateUserRole(
    actorUserId: string,
    userId: string,
    platformRole: 'USER' | 'MODERATOR' | 'ADMIN',
  ) {
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const user = await transaction.user.update({
          where: { id: userId },
          data: { platformRole },
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            platformRole: true,
            emailVerifiedAt: true,
            createdAt: true,
          },
        });
        await transaction.auditLog.create({
          data: {
            actorUserId,
            action: 'USER_PLATFORM_ROLE_UPDATED',
            resourceType: 'USER',
            resourceId: userId,
            metadata: { platformRole },
          },
        });
        return user;
      });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('USER_NOT_FOUND');
      }
      throw error;
    }
  }
}
