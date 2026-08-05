import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';

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
      publishedListings,
      acceptedProposals,
      pipelineProposals,
      openModeration,
      verifiedCompanies,
      usersByStatus,
      totalProposals,
      activeDeals,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.company.count({ where: { deletedAt: null } }),
      this.prisma.listing.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.listing.groupBy({ by: ['type'], _count: { _all: true } }),
      this.prisma.proposal.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.deal.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.listing.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        select: {
          category: { select: { name: true } },
          type: true,
          _count: { select: { proposals: true } },
        },
      }),
      this.prisma.proposal.findMany({
        where: { status: 'ACCEPTED' },
        select: { quantity: true, unitPrice: true },
      }),
      this.prisma.proposal.findMany({
        where: { status: { in: ['PENDING', 'COUNTERED', 'ACCEPTED'] } },
        select: { quantity: true, unitPrice: true },
      }),
      this.prisma.moderationCase.count({
        where: { status: { in: ['OPEN', 'IN_REVIEW'] } },
      }),
      this.prisma.company.count({
        where: { deletedAt: null, verification: 'VERIFIED' },
      }),
      this.prisma.user.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.proposal.count(),
      this.prisma.deal.count({
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
    ]);

    const grossValue = acceptedProposals.reduce(
      (total, proposal) =>
        total + Number(proposal.quantity) * Number(proposal.unitPrice),
      0,
    );
    const pipelineValue = pipelineProposals.reduce(
      (total, proposal) =>
        total + Number(proposal.quantity) * Number(proposal.unitPrice),
      0,
    );
    const demandMap = new Map<
      string,
      { listings: number; proposals: number }
    >();
    for (const listing of publishedListings) {
      const current = demandMap.get(listing.category.name) ?? {
        listings: 0,
        proposals: 0,
      };
      current.listings += 1;
      current.proposals += listing._count.proposals;
      demandMap.set(listing.category.name, current);
    }

    return {
      generatedAt: new Date().toISOString(),
      kpis: {
        users,
        companies,
        verifiedCompanies,
        totalProposals,
        activeDeals,
        publishedListings: publishedListings.length,
        acceptedDeals:
          dealStatuses.find((item) => item.status === 'COMPLETED')?._count
            ._all ?? 0,
        openModeration,
        grossTransactionValue: grossValue,
        estimatedCommissionMin: grossValue * 0.05,
        estimatedCommissionMax: grossValue * 0.15,
        pipelineValue,
        conversionRate:
          totalProposals === 0
            ? 0
            : (acceptedProposals.length / totalProposals) * 100,
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
      demandByCategory: [...demandMap.entries()]
        .map(([category, values]) => ({ category, ...values }))
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
    userId: string,
    platformRole: 'USER' | 'MODERATOR' | 'ADMIN',
  ) {
    try {
      return await this.prisma.user.update({
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
