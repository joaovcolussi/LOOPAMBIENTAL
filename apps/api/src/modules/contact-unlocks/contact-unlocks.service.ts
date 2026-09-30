import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@loopambiental/database';
import { PrismaService } from '../../infrastructure/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class ContactUnlocksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  async unlock(
    userId: string,
    listingId: string,
    companyId: string,
  ): Promise<unknown> {
    if (!companyId) throw new ForbiddenException('COMPANY_ACCESS_DENIED');
    await this.assertMember(userId, companyId);
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, status: 'PUBLISHED', deletedAt: null },
      select: { id: true },
    });
    if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');

    const existing = await this.prisma.contactUnlock.findUnique({
      where: { companyId_listingId: { companyId, listingId } },
    });
    if (existing) return existing;

    const source = await this.resolveSource(companyId);
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const created = await transaction.contactUnlock.create({
          data: { companyId, listingId, userId, source },
        });
        await transaction.auditLog.create({
          data: {
            actorUserId: userId,
            action: 'CONTACT_UNLOCKED',
            resourceType: 'LISTING',
            resourceId: listingId,
            metadata: { companyId, source },
          },
        });
        return created;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const concurrent = await this.prisma.contactUnlock.findUnique({
          where: { companyId_listingId: { companyId, listingId } },
        });
        if (concurrent) return concurrent;
      }
      throw error;
    }
  }

  async status(userId: string, listingId: string): Promise<unknown> {
    const unlock = await this.prisma.contactUnlock.findFirst({
      where: { listingId, company: { members: { some: { userId } } } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, companyId: true, source: true, createdAt: true },
    });
    return { unlocked: Boolean(unlock), unlock: unlock ?? null };
  }

  hasUnlockForUser(userId: string, listingId: string) {
    return this.prisma.contactUnlock
      .findFirst({
        where: { listingId, company: { members: { some: { userId } } } },
        select: { id: true },
      })
      .then((unlock) => Boolean(unlock));
  }

  async listForCompany(userId: string, companyId: string): Promise<unknown> {
    await this.assertMember(userId, companyId);
    return this.prisma.contactUnlock.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        listingId: true,
        source: true,
        createdAt: true,
        listing: {
          select: { id: true, title: true, slug: true, status: true },
        },
      },
    });
  }

  private async resolveSource(companyId: string): Promise<'PLAN' | 'ONE_TIME'> {
    const subscription = await this.subscriptions.findActive(companyId);
    if (!subscription) return 'ONE_TIME';
    const limit = this.subscriptions.contactUnlockLimit(
      subscription.plan.features,
    );
    if (limit === -1 || limit === null) return 'PLAN';
    const since = subscription.currentPeriodStart ?? subscription.createdAt;
    const used = await this.prisma.contactUnlock.count({
      where: { companyId, source: 'PLAN', createdAt: { gte: since } },
    });
    return used < limit ? 'PLAN' : 'ONE_TIME';
  }

  private async assertMember(userId: string, companyId: string) {
    const membership = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
    if (!membership) throw new ForbiddenException('COMPANY_ACCESS_DENIED');
  }
}
