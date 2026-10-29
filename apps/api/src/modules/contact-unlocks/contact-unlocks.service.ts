import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Prisma } from '@loopambiental/database';
import { PrismaService } from '../../infrastructure/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PaymentsService } from '../payments/payments.service';

export const CONTACT_UNLOCK_PRICE_SETTING = 'contact_unlock_price';
export const DEFAULT_CONTACT_UNLOCK_PRICE = 29.9;

@Injectable()
export class ContactUnlocksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptions: SubscriptionsService,
    @Optional() private readonly payments?: PaymentsService,
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
      select: { id: true, title: true, companyId: true },
    });
    if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');
    if (listing.companyId === companyId)
      throw new ForbiddenException('CONTACT_UNLOCK_OWN_LISTING');

    const existing = await this.prisma.contactUnlock.findUnique({
      where: { companyId_listingId: { companyId, listingId } },
    });
    if (existing) return existing;

    const source = await this.resolveSource(companyId);
    if (source === 'ONE_TIME' && this.payments) {
      // Without plan quota the unlock is a one-time purchase: it only becomes
      // effective after the payment settles (see PaymentsService.settle).
      const price = await this.oneTimePrice();
      if (price.gt(0)) {
        const payment = await this.payments.createCharge({
          purpose: 'CONTACT_UNLOCK',
          userId,
          companyId,
          listingId,
          amount: price.toFixed(2),
          title: `Desbloqueio de contato: ${listing.title}`.slice(0, 180),
        });
        return { paymentRequired: true, payment };
      }
    }
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

  async oneTimePrice() {
    const setting = await this.prisma.platformSetting.findUnique({
      where: { key: CONTACT_UNLOCK_PRICE_SETTING },
      select: { value: true },
    });
    const value =
      typeof setting?.value === 'number'
        ? setting.value
        : DEFAULT_CONTACT_UNLOCK_PRICE;
    return new Prisma.Decimal(value);
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
