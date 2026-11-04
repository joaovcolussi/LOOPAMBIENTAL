import {
  quotaWindowStart,
  SubscriptionsService,
} from '../src/modules/subscriptions/subscriptions.service';

function makeService(prisma: unknown, notifications?: unknown) {
  return new SubscriptionsService(
    prisma as never,
    (notifications ?? { create: jest.fn().mockResolvedValue({}) }) as never,
  );
}

describe('SubscriptionsService', () => {
  it('activates a plan for a company manager', async () => {
    const created = {
      id: 'subscription-id',
      status: 'ACTIVE',
      plan: { id: 'plan-id', code: 'ESSENCIAL', name: 'Essencial' },
    };
    const transaction = {
      subscription: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(created),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const notifications = { create: jest.fn().mockResolvedValue({}) };
    const prisma = {
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'OWNER' }),
        findMany: jest.fn().mockResolvedValue([{ userId: 'owner-1' }]),
      },
      plan: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'plan-id',
          code: 'ESSENCIAL',
          name: 'Essencial',
        }),
      },
      subscription: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((callback) => callback(transaction)),
    };
    const service = makeService(prisma, notifications);

    await expect(
      service.activate('user-id', 'company-id', 'plan-id'),
    ).resolves.toEqual(created);
    expect(transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'SUBSCRIPTION_ACTIVATED',
        resourceType: 'SUBSCRIPTION',
      }),
    });
    expect(notifications.create).toHaveBeenCalledWith(
      'owner-1',
      expect.objectContaining({ type: 'SYSTEM' }),
    );
  });

  it('refuses to re-activate the free plan that is already active', async () => {
    const prisma = {
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'OWNER' }),
      },
      plan: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'free-plan',
          code: 'gratuito',
          name: 'Gratuito',
          priceMonthly: '0.00',
        }),
      },
      subscription: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'subscription-id',
          status: 'ACTIVE',
          plan: { id: 'free-plan' },
        }),
      },
      $transaction: jest.fn(),
    };
    const service = makeService(prisma);

    await expect(
      service.activate('user-id', 'company-id', 'free-plan'),
    ).rejects.toThrow('PLAN_ALREADY_ACTIVE');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('counts free-plan unlocks over a rolling window, paid ones per period', () => {
    const periodStart = new Date('2026-01-01T00:00:00.000Z');
    expect(
      quotaWindowStart({
        currentPeriodStart: periodStart,
        createdAt: periodStart,
        plan: { priceMonthly: '149.90' },
      }),
    ).toEqual(periodStart);
    const freeWindow = quotaWindowStart({
      currentPeriodStart: new Date(),
      createdAt: new Date(),
      plan: { priceMonthly: '0.00' },
    });
    expect(Date.now() - freeWindow.getTime()).toBeGreaterThanOrEqual(
      30 * 24 * 60 * 60 * 1000 - 1000,
    );
  });

  it('rejects activation by a regular member', async () => {
    const prisma = {
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'MEMBER' }),
      },
    };
    const service = makeService(prisma);

    await expect(
      service.activate('user-id', 'company-id', 'plan-id'),
    ).rejects.toThrow('COMPANY_MANAGEMENT_REQUIRED');
  });

  it('fails to cancel when there is no active subscription', async () => {
    const prisma = {
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'OWNER' }),
      },
      subscription: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = makeService(prisma);

    await expect(service.cancel('user-id', 'company-id')).rejects.toThrow(
      'SUBSCRIPTION_NOT_FOUND',
    );
  });

  it('computes the remaining contact-unlock quota', async () => {
    const subscription = {
      id: 'subscription-id',
      status: 'ACTIVE',
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
      currentPeriodEnd: null,
      cancelAt: null,
      cancelledAt: null,
      provider: 'INTERNAL',
      plan: {
        id: 'plan-id',
        code: 'PROFISSIONAL',
        name: 'Profissional',
        description: null,
        priceMonthly: '499.00',
        currency: 'BRL',
        features: { contactUnlocks: 10 },
      },
    };
    const prisma = {
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'MEMBER' }),
      },
      subscription: { findFirst: jest.fn().mockResolvedValue(subscription) },
      contactUnlock: { count: jest.fn().mockResolvedValue(3) },
    };
    const service = makeService(prisma);

    const result = (await service.getForCompany('user-id', 'company-id')) as {
      usage: {
        contactUnlocks: {
          used: number;
          limit: number | null;
          remaining: number | null;
        };
      };
    };
    expect(result.usage.contactUnlocks).toEqual({
      used: 3,
      limit: 10,
      remaining: 7,
    });
  });

  it('parses the contact unlock limit from features', () => {
    const service = makeService({});
    expect(service.contactUnlockLimit({ contactUnlocks: 5 })).toBe(5);
    expect(service.contactUnlockLimit({ contactUnlocks: -1 })).toBe(-1);
    expect(service.contactUnlockLimit({})).toBeNull();
    expect(service.contactUnlockLimit(null)).toBeNull();
  });
});
