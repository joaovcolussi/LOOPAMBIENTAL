import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@loopambiental/database';
import { PrismaService } from '../../infrastructure/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const ELIGIBLE_DEAL_STATUSES = ['COMPLETED'];

const reviewSelect = {
  id: true,
  rating: true,
  comment: true,
  createdAt: true,
  updatedAt: true,
  authorCompany: { select: { id: true, legalName: true, tradeName: true } },
  reviewedCompany: { select: { id: true, legalName: true, tradeName: true } },
  authorUser: { select: { id: true, name: true } },
} as const;

function companyName(company: {
  legalName: string;
  tradeName: string | null;
}): string {
  return company.tradeName || company.legalName;
}

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async listForDeal(userId: string, dealId: string) {
    const deal = await this.getDeal(dealId);
    await this.assertParticipant(userId, deal);
    const reviews = await this.prisma.review.findMany({
      where: { dealId },
      orderBy: { createdAt: 'desc' },
      select: reviewSelect,
    });
    return reviews;
  }

  async listForCompany(slugOrId: string) {
    const company = await this.prisma.company.findFirst({
      where: {
        OR: [{ slug: slugOrId }, { id: slugOrId }],
        deletedAt: null,
      },
      select: {
        id: true,
        ratingAverage: true,
        ratingCount: true,
      },
    });
    if (!company) throw new NotFoundException('COMPANY_NOT_FOUND');
    const reviews = await this.prisma.review.findMany({
      where: { reviewedCompanyId: company.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        authorCompany: {
          select: { id: true, legalName: true, tradeName: true },
        },
        authorUser: { select: { id: true, name: true } },
      },
    });
    return {
      summary: {
        average: Number(company.ratingAverage),
        count: company.ratingCount,
      },
      reviews,
    };
  }

  async create(userId: string, dealId: string, input: unknown) {
    const body =
      input && typeof input === 'object'
        ? (input as Record<string, unknown>)
        : {};
    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
      throw new BadRequestException('INVALID_RATING');
    const comment =
      typeof body.comment === 'string'
        ? body.comment.trim().slice(0, 2000)
        : '';
    const authorCompanyId =
      typeof body.authorCompanyId === 'string'
        ? body.authorCompanyId.trim()
        : '';
    if (!authorCompanyId)
      throw new BadRequestException('AUTHOR_COMPANY_REQUIRED');

    const deal = await this.getDeal(dealId);
    if (!ELIGIBLE_DEAL_STATUSES.includes(deal.status))
      throw new BadRequestException('DEAL_NOT_COMPLETED');

    const isBuyer = deal.buyerCompanyId === authorCompanyId;
    const isSeller = deal.sellerCompanyId === authorCompanyId;
    if (!isBuyer && !isSeller)
      throw new ForbiddenException('DEAL_ACCESS_DENIED');

    await this.assertMembership(userId, authorCompanyId);

    const reviewedCompanyId = isBuyer
      ? deal.sellerCompanyId
      : deal.buyerCompanyId;

    const existing = await this.prisma.review.findUnique({
      where: {
        dealId_authorCompanyId: { dealId, authorCompanyId },
      },
      select: { id: true },
    });
    if (existing) throw new ConflictException('REVIEW_ALREADY_EXISTS');

    let created;
    try {
      created = await this.prisma.$transaction(async (transaction) => {
        const review = await transaction.review.create({
          data: {
            dealId,
            authorUserId: userId,
            authorCompanyId,
            reviewedCompanyId,
            rating,
            comment: comment || null,
          },
          select: reviewSelect,
        });
        const aggregate = await transaction.review.aggregate({
          where: { reviewedCompanyId },
          _avg: { rating: true },
          _count: { _all: true },
        });
        await transaction.company.update({
          where: { id: reviewedCompanyId },
          data: {
            ratingAverage: new Prisma.Decimal(
              (aggregate._avg.rating ?? 0).toFixed(2),
            ),
            ratingCount: aggregate._count._all,
          },
        });
        await transaction.auditLog.create({
          data: {
            actorUserId: userId,
            action: 'REVIEW_CREATED',
            resourceType: 'COMPANY',
            resourceId: reviewedCompanyId,
            metadata: { dealId, rating, authorCompanyId },
          },
        });
        return review;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new ConflictException('REVIEW_ALREADY_EXISTS');
      throw error;
    }

    const members = await this.prisma.companyMember.findMany({
      where: {
        companyId: reviewedCompanyId,
        role: { in: ['OWNER', 'ADMIN'] },
      },
      select: { userId: true },
    });
    await Promise.all(
      members.map((member) =>
        this.notifications.create(member.userId, {
          type: 'SYSTEM',
          title: 'Nova avaliação recebida',
          body: `${companyName(created.authorCompany)} avaliou sua empresa com ${rating} de 5.`,
          payload: { dealId, reviewId: created.id },
        }),
      ),
    );

    return created;
  }

  async pending(userId: string) {
    const memberships = await this.prisma.companyMember.findMany({
      where: { userId },
      select: { companyId: true },
    });
    const companyIds = memberships.map((membership) => membership.companyId);
    if (companyIds.length === 0) return [];
    const deals = await this.prisma.deal.findMany({
      where: {
        status: 'COMPLETED',
        OR: [
          { buyerCompanyId: { in: companyIds } },
          { sellerCompanyId: { in: companyIds } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        buyerCompanyId: true,
        sellerCompanyId: true,
        updatedAt: true,
        listing: { select: { id: true, title: true, slug: true } },
        buyerCompany: {
          select: { id: true, legalName: true, tradeName: true },
        },
        sellerCompany: {
          select: { id: true, legalName: true, tradeName: true },
        },
        reviews: { select: { authorCompanyId: true } },
      },
    });
    const pending: Array<{
      dealId: string;
      listing: { id: string; title: string; slug: string };
      authorCompany: {
        id: string;
        legalName: string;
        tradeName: string | null;
      };
      reviewedCompany: {
        id: string;
        legalName: string;
        tradeName: string | null;
      };
      completedAt: Date;
    }> = [];
    for (const deal of deals) {
      for (const companyId of [deal.buyerCompanyId, deal.sellerCompanyId]) {
        if (!companyIds.includes(companyId)) continue;
        const alreadyReviewed = deal.reviews.some(
          (review) => review.authorCompanyId === companyId,
        );
        if (alreadyReviewed) continue;
        const isBuyer = companyId === deal.buyerCompanyId;
        pending.push({
          dealId: deal.id,
          listing: deal.listing,
          authorCompany: isBuyer ? deal.buyerCompany : deal.sellerCompany,
          reviewedCompany: isBuyer ? deal.sellerCompany : deal.buyerCompany,
          completedAt: deal.updatedAt,
        });
      }
    }
    return pending;
  }

  private getDeal(dealId: string) {
    return this.prisma.deal
      .findUnique({
        where: { id: dealId },
        select: {
          id: true,
          status: true,
          buyerCompanyId: true,
          sellerCompanyId: true,
        },
      })
      .then((deal) => {
        if (!deal) throw new NotFoundException('DEAL_NOT_FOUND');
        return deal;
      });
  }

  private async assertParticipant(
    userId: string,
    deal: { buyerCompanyId: string; sellerCompanyId: string },
  ) {
    const membership = await this.prisma.companyMember.findFirst({
      where: {
        userId,
        companyId: {
          in: [deal.buyerCompanyId, deal.sellerCompanyId],
        },
      },
      select: { companyId: true },
    });
    if (!membership) throw new ForbiddenException('DEAL_ACCESS_DENIED');
  }

  private async assertMembership(userId: string, companyId: string) {
    const membership = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
    if (!membership) throw new ForbiddenException('COMPANY_ACCESS_DENIED');
  }
}
