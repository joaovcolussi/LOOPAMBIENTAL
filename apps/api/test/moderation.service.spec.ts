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
});
