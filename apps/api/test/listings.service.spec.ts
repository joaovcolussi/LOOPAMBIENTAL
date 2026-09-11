import { ListingsService } from '../src/modules/listings/listings.service';

describe('ListingsService', () => {
  it('rejects submitting an already published listing', async () => {
    const prisma = {
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'OWNER' }),
      },
      listing: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'listing-id',
          companyId: 'company-id',
          createdByUserId: 'user-id',
          status: 'PUBLISHED',
        }),
        update: jest.fn(),
      },
    };
    const service = new ListingsService(prisma as never, {} as never);

    await expect(service.submit('user-id', 'listing-id')).rejects.toThrow(
      'INVALID_LISTING_TRANSITION',
    );
    expect(prisma.listing.update).not.toHaveBeenCalled();
  });

  it('blocks a member from managing another member listing', async () => {
    const prisma = {
      listing: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'listing-id',
          companyId: 'company-id',
          createdByUserId: 'other-user',
          status: 'DRAFT',
        }),
      },
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'MEMBER' }),
      },
    };
    const service = new ListingsService(prisma as never, {} as never);

    await expect(service.submit('user-id', 'listing-id')).rejects.toThrow(
      'LISTING_MANAGEMENT_REQUIRED',
    );
  });

  it('creates a moderation case when a published listing is edited', async () => {
    const transaction = {
      listing: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'listing-id',
          status: 'PENDING_REVIEW',
        }),
      },
      moderationCase: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      listing: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'listing-id',
          companyId: 'company-id',
          createdByUserId: 'user-id',
          categoryId: 'category-id',
          materialId: null,
          status: 'PUBLISHED',
        }),
      },
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'OWNER' }),
      },
      $transaction: jest.fn((callback) => callback(transaction)),
    };
    const service = new ListingsService(prisma as never, {} as never);

    await service.update('user-id', 'listing-id', {
      description: 'Atualizada',
    });

    expect(transaction.moderationCase.create).toHaveBeenCalledWith({
      data: { listingId: 'listing-id' },
    });
  });

  it('does not create duplicate moderation cases on concurrent submission', async () => {
    const transaction = {
      listing: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      moderationCase: { create: jest.fn() },
    };
    const prisma = {
      listing: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'listing-id',
          companyId: 'company-id',
          createdByUserId: 'user-id',
          status: 'DRAFT',
        }),
      },
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'OWNER' }),
      },
      $transaction: jest.fn((callback) => callback(transaction)),
    };
    const service = new ListingsService(prisma as never, {} as never);

    await expect(service.submit('user-id', 'listing-id')).rejects.toThrow(
      'LISTING_STATE_CHANGED',
    );
    expect(transaction.moderationCase.create).not.toHaveBeenCalled();
  });
});
