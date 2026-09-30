import { ContactUnlocksService } from '../src/modules/contact-unlocks/contact-unlocks.service';

function makeService(
  prisma: unknown,
  subscriptions: {
    findActive?: jest.Mock;
    contactUnlockLimit?: (features: unknown) => number | null;
  } = {},
) {
  const subscriptionsMock = {
    findActive: subscriptions.findActive ?? jest.fn().mockResolvedValue(null),
    contactUnlockLimit:
      subscriptions.contactUnlockLimit ??
      ((features: unknown) => {
        if (!features || typeof features !== 'object') return null;
        const value = (features as Record<string, unknown>).contactUnlocks;
        return typeof value === 'number' ? value : null;
      }),
  };
  return new ContactUnlocksService(prisma as never, subscriptionsMock as never);
}

describe('ContactUnlocksService', () => {
  it('returns an existing unlock without creating a new one', async () => {
    const existing = { id: 'unlock-id', companyId: 'company-id' };
    const create = jest.fn();
    const prisma = {
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'OWNER' }),
      },
      listing: { findFirst: jest.fn().mockResolvedValue({ id: 'listing-id' }) },
      contactUnlock: {
        findUnique: jest.fn().mockResolvedValue(existing),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(),
    };
    const service = makeService(prisma);

    await expect(
      service.unlock('user-id', 'listing-id', 'company-id'),
    ).resolves.toEqual(existing);
    expect(create).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('uses the plan quota as the unlock source when available', async () => {
    const created = { id: 'unlock-id', source: 'PLAN' };
    const transaction = {
      contactUnlock: { create: jest.fn().mockResolvedValue(created) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'MEMBER' }),
      },
      listing: { findFirst: jest.fn().mockResolvedValue({ id: 'listing-id' }) },
      contactUnlock: {
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(1),
      },
      $transaction: jest.fn((callback) => callback(transaction)),
    };
    const service = makeService(prisma, {
      findActive: jest.fn().mockResolvedValue({
        currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        plan: { features: { contactUnlocks: 5 } },
      }),
    });

    await service.unlock('user-id', 'listing-id', 'company-id');

    expect(transaction.contactUnlock.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ source: 'PLAN' }),
    });
    expect(transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'CONTACT_UNLOCKED' }),
    });
  });

  it('falls back to a one-time unlock when the quota is exhausted', async () => {
    const transaction = {
      contactUnlock: {
        create: jest.fn().mockResolvedValue({ id: 'unlock-id' }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'MEMBER' }),
      },
      listing: { findFirst: jest.fn().mockResolvedValue({ id: 'listing-id' }) },
      contactUnlock: {
        findUnique: jest.fn().mockResolvedValue(null),
        count: jest.fn().mockResolvedValue(5),
      },
      $transaction: jest.fn((callback) => callback(transaction)),
    };
    const service = makeService(prisma, {
      findActive: jest.fn().mockResolvedValue({
        currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        plan: { features: { contactUnlocks: 5 } },
      }),
    });

    await service.unlock('user-id', 'listing-id', 'company-id');

    expect(transaction.contactUnlock.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ source: 'ONE_TIME' }),
    });
  });

  it('denies unlocking for a company the user does not belong to', async () => {
    const prisma = {
      companyMember: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const service = makeService(prisma);

    await expect(
      service.unlock('user-id', 'listing-id', 'company-id'),
    ).rejects.toThrow('COMPANY_ACCESS_DENIED');
  });
});
