import { ProposalsService } from '../src/modules/proposals/proposals.service';

describe('ProposalsService transitions', () => {
  it('commits and notifies a successful counteroffer', async () => {
    const updated = { id: 'proposal-id', status: 'COUNTERED' };
    const transaction = {
      proposal: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn().mockResolvedValue(updated),
      },
      proposalRevision: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      proposal: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'proposal-id',
          status: 'PENDING',
          validUntil: null,
          proposerCompanyId: 'buyer-id',
          createdByUserId: 'buyer-user-id',
          listing: { companyId: 'seller-id', type: 'SELL' },
        }),
      },
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'OWNER' }),
      },
      $transaction: jest.fn((callback) => callback(transaction)),
    };
    const notifications = { create: jest.fn().mockResolvedValue({}) };
    const service = new ProposalsService(
      prisma as never,
      notifications as never,
    );

    await expect(
      service.counter('seller-user-id', 'proposal-id', {
        quantity: '10.000',
        unitPrice: '2.50',
      }),
    ).resolves.toEqual(updated);
    expect(notifications.create).toHaveBeenCalledWith(
      'buyer-user-id',
      expect.objectContaining({ type: 'PROPOSAL_COUNTERED' }),
    );
  });

  it('does not create a revision when a concurrent counter wins', async () => {
    const transaction = {
      proposal: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn(),
      },
      proposalRevision: { create: jest.fn() },
    };
    const prisma = {
      proposal: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'proposal-id',
          status: 'PENDING',
          validUntil: null,
          proposerCompanyId: 'buyer-id',
          createdByUserId: 'buyer-user-id',
          listing: { companyId: 'seller-id', type: 'SELL' },
        }),
      },
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'OWNER' }),
      },
      $transaction: jest.fn((callback) => callback(transaction)),
    };
    const notifications = { create: jest.fn() };
    const service = new ProposalsService(
      prisma as never,
      notifications as never,
    );

    await expect(
      service.counter('seller-user-id', 'proposal-id', {
        quantity: '10.000',
        unitPrice: '2.50',
      }),
    ).rejects.toThrow('INVALID_PROPOSAL_TRANSITION');
    expect(transaction.proposalRevision.create).not.toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });

  it('allows only the proposer side to answer a counteroffer', async () => {
    const prisma = {
      proposal: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'proposal-id',
          status: 'COUNTERED',
          validUntil: null,
          proposerCompanyId: 'buyer-id',
          createdByUserId: 'buyer-user-id',
          listingId: 'listing-id',
          listing: { companyId: 'seller-id', type: 'SELL' },
        }),
      },
      companyMember: {
        findMany: jest.fn().mockResolvedValue([{ companyId: 'seller-id' }]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      deal: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const service = new ProposalsService(prisma as never, {} as never);

    await expect(
      service.accept('seller-user-id', 'proposal-id'),
    ).rejects.toThrow('PROPOSAL_MANAGEMENT_REQUIRED');
    expect(prisma.companyMember.findUnique).toHaveBeenCalledWith({
      where: {
        companyId_userId: {
          companyId: 'buyer-id',
          userId: 'seller-user-id',
        },
      },
    });
  });

  it('returns an existing deal when acceptance is retried', async () => {
    const existingDeal = { id: 'deal-id', status: 'OPEN' };
    const prisma = {
      proposal: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'proposal-id',
          status: 'ACCEPTED',
          validUntil: null,
          proposerCompanyId: 'buyer-id',
          createdByUserId: 'buyer-user-id',
          listingId: 'listing-id',
          listing: { companyId: 'seller-id', type: 'SELL' },
        }),
      },
      companyMember: {
        findMany: jest.fn().mockResolvedValue([{ companyId: 'buyer-id' }]),
      },
      deal: { findUnique: jest.fn().mockResolvedValue(existingDeal) },
    };
    const service = new ProposalsService(prisma as never, {} as never);

    await expect(
      service.accept('buyer-user-id', 'proposal-id'),
    ).resolves.toEqual(existingDeal);
  });
});
