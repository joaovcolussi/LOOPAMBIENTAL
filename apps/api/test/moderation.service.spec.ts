import { ModerationService } from '../src/modules/moderation/moderation.service';

describe('ModerationService', () => {
  it('does not publish when another reviewer already decided the case', async () => {
    const transaction = {
      moderationCase: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      listing: { update: jest.fn() },
      moderationAction: { create: jest.fn() },
    };
    const prisma = {
      moderationCase: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'case-id',
          listingId: 'listing-id',
        }),
      },
      $transaction: jest.fn((callback) => callback(transaction)),
    };
    const service = new ModerationService(prisma as never);

    await expect(service.approve('case-id', 'admin-id')).rejects.toThrow(
      'MODERATION_ALREADY_DECIDED',
    );
    expect(transaction.listing.update).not.toHaveBeenCalled();
    expect(transaction.moderationAction.create).not.toHaveBeenCalled();
  });

  it('records listing history when approving', async () => {
    const transaction = {
      moderationCase: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      listing: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({ id: 'listing-id', status: 'PUBLISHED' }),
      },
      moderationAction: { create: jest.fn().mockResolvedValue({}) },
      listingStatusHistory: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      moderationCase: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'case-id', listingId: 'listing-id' }),
      },
      $transaction: jest.fn((callback) => callback(transaction)),
    };
    const service = new ModerationService(prisma as never);

    await service.approve('case-id', 'admin-id');

    expect(transaction.listingStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        listingId: 'listing-id',
        toStatus: 'PUBLISHED',
      }),
    });
  });
});
