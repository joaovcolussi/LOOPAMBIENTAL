import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const PERIOD_DAYS = 30;
const PERIOD_MS = PERIOD_DAYS * 24 * 60 * 60 * 1000;

const planSelect = {
  id: true,
  code: true,
  name: true,
  description: true,
  priceMonthly: true,
  currency: true,
  features: true,
} as const;

const subscriptionSelect = {
  id: true,
  provider: true,
  status: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  cancelAt: true,
  cancelledAt: true,
  createdAt: true,
  plan: { select: planSelect },
} as const;

export type ContactUnlockUsage = {
  used: number;
  limit: number | null;
  remaining: number | null;
};

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  listPlans(): Promise<unknown> {
    return this.prisma.plan.findMany({
      where: { isActive: true },
      orderBy: [{ priceMonthly: 'asc' }, { name: 'asc' }],
      select: planSelect,
    });
  }

  async getForCompany(userId: string, companyId: string): Promise<unknown> {
    await this.assertMember(userId, companyId);
    const subscription = await this.findCurrent(companyId);
    return {
      subscription,
      usage: await this.buildUsage(companyId, subscription),
    };
  }

  async activate(
    userId: string,
    companyId: string,
    planId: string,
  ): Promise<unknown> {
    await this.assertManager(userId, companyId);
    if (!planId) throw new BadRequestException('INVALID_PLAN');
    const plan = await this.prisma.plan.findFirst({
      where: { id: planId, isActive: true },
      select: planSelect,
    });
    if (!plan) throw new NotFoundException('PLAN_NOT_FOUND');

    const now = new Date();
    const periodEnd = new Date(now.getTime() + PERIOD_MS);
    const subscription = await this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.subscription.findFirst({
        where: {
          companyId,
          status: { in: ['ACTIVE', 'PENDING', 'PAST_DUE'] },
        },
        orderBy: { createdAt: 'desc' },
      });
      const saved = existing
        ? await transaction.subscription.update({
            where: { id: existing.id },
            data: {
              planId,
              status: 'ACTIVE',
              provider: 'INTERNAL',
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
              cancelAt: null,
              cancelledAt: null,
            },
            select: subscriptionSelect,
          })
        : await transaction.subscription.create({
            data: {
              companyId,
              planId,
              provider: 'INTERNAL',
              status: 'ACTIVE',
              currentPeriodStart: now,
              currentPeriodEnd: periodEnd,
            },
            select: subscriptionSelect,
          });
      await transaction.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'SUBSCRIPTION_ACTIVATED',
          resourceType: 'SUBSCRIPTION',
          resourceId: saved.id,
          metadata: { companyId, planId, planCode: plan.code },
        },
      });
      return saved;
    });

    await this.notifyManagers(companyId, {
      title: 'Assinatura ativada',
      body: `O plano ${plan.name} está ativo para sua empresa.`,
    });
    return subscription;
  }

  async cancel(userId: string, companyId: string): Promise<unknown> {
    await this.assertManager(userId, companyId);
    const existing = await this.findCurrent(companyId);
    if (!existing) throw new NotFoundException('SUBSCRIPTION_NOT_FOUND');
    const cancelled = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.subscription.update({
        where: { id: existing.id },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelAt: null },
        select: subscriptionSelect,
      });
      await transaction.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'SUBSCRIPTION_CANCELLED',
          resourceType: 'SUBSCRIPTION',
          resourceId: existing.id,
          metadata: { companyId },
        },
      });
      return updated;
    });
    return cancelled;
  }

  findActive(companyId: string): Promise<{
    currentPeriodStart: Date | null;
    createdAt: Date;
    plan: { features: unknown };
  } | null> {
    return this.prisma.subscription.findFirst({
      where: { companyId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: {
        currentPeriodStart: true,
        createdAt: true,
        plan: { select: { features: true } },
      },
    });
  }

  private findCurrent(companyId: string) {
    return this.prisma.subscription.findFirst({
      where: {
        companyId,
        status: { in: ['ACTIVE', 'PENDING', 'PAST_DUE'] },
      },
      orderBy: { createdAt: 'desc' },
      select: subscriptionSelect,
    });
  }

  private async buildUsage(
    companyId: string,
    subscription: {
      currentPeriodStart: Date | null;
      createdAt: Date;
      plan: { features: unknown };
    } | null,
  ) {
    const limit = this.contactUnlockLimit(subscription?.plan.features);
    if (!subscription || limit === null) {
      return { contactUnlocks: { used: 0, limit: null, remaining: null } };
    }
    if (limit === -1) {
      const used = await this.countPlanUnlocks(
        companyId,
        subscription.currentPeriodStart ?? subscription.createdAt,
      );
      return { contactUnlocks: { used, limit: null, remaining: null } };
    }
    const used = await this.countPlanUnlocks(
      companyId,
      subscription.currentPeriodStart ?? subscription.createdAt,
    );
    return {
      contactUnlocks: { used, limit, remaining: Math.max(0, limit - used) },
    };
  }

  private countPlanUnlocks(companyId: string, since: Date) {
    return this.prisma.contactUnlock.count({
      where: { companyId, source: 'PLAN', createdAt: { gte: since } },
    });
  }

  contactUnlockLimit(features: unknown): number | null {
    if (!features || typeof features !== 'object') return null;
    const value = (features as Record<string, unknown>).contactUnlocks;
    return typeof value === 'number' ? value : null;
  }

  private async notifyManagers(
    companyId: string,
    input: { title: string; body: string },
  ) {
    const members = await this.prisma.companyMember.findMany({
      where: { companyId, role: { in: ['OWNER', 'ADMIN'] } },
      select: { userId: true },
    });
    await Promise.all(
      members.map((member) =>
        this.notifications.create(member.userId, {
          type: 'SYSTEM',
          title: input.title,
          body: input.body,
          payload: { companyId },
        }),
      ),
    );
  }

  private async assertMember(userId: string, companyId: string) {
    const membership = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
    if (!membership) throw new ForbiddenException('COMPANY_ACCESS_DENIED');
  }

  private async assertManager(userId: string, companyId: string) {
    const membership = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
    if (!membership) throw new ForbiddenException('COMPANY_ACCESS_DENIED');
    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN')
      throw new ForbiddenException('COMPANY_MANAGEMENT_REQUIRED');
  }
}
