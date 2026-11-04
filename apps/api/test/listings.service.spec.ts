import { Prisma } from '@loopambiental/database';
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
      listingStatusHistory: { create: jest.fn().mockResolvedValue({}) },
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

  it('shifts available stock by the quantity change instead of resetting it', async () => {
    const transaction = {
      listing: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'listing-id' }),
      },
      moderationCase: { create: jest.fn() },
      listingStatusHistory: { create: jest.fn() },
    };
    const prisma = {
      listing: {
        // 1000 total, 400 already committed to deals.
        findFirst: jest.fn().mockResolvedValue({
          id: 'listing-id',
          companyId: 'company-id',
          createdByUserId: 'user-id',
          categoryId: 'category-id',
          materialId: null,
          status: 'PAUSED',
          quantity: new Prisma.Decimal('1000'),
          availableQuantity: new Prisma.Decimal('600'),
        }),
      },
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'OWNER' }),
      },
      $transaction: jest.fn((callback) => callback(transaction)),
    };
    const service = new ListingsService(prisma as never, {} as never);

    await service.update('user-id', 'listing-id', {
      quantity: '1000',
      description: 'Só a descrição',
    });
    const unchanged = transaction.listing.updateMany.mock.calls[0][0];
    expect(unchanged.data.availableQuantity).toBeUndefined();
    expect(unchanged.data.quantity).toBeUndefined();

    await service.update('user-id', 'listing-id', { quantity: '1200' });
    const grown = transaction.listing.updateMany.mock.calls[1][0];
    expect(grown.data.availableQuantity.increment.toString()).toBe('200');
    expect(grown.where.quantity.toString()).toBe('1000');

    await expect(
      service.update('user-id', 'listing-id', { quantity: '300' }),
    ).rejects.toThrow('QUANTITY_BELOW_COMMITTED');
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

  it('records a status history entry when submitting', async () => {
    const transaction = {
      listing: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({ id: 'listing-id', status: 'PENDING_REVIEW' }),
      },
      moderationCase: { create: jest.fn().mockResolvedValue({}) },
      listingStatusHistory: { create: jest.fn().mockResolvedValue({}) },
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

    await service.submit('user-id', 'listing-id');

    expect(transaction.listingStatusHistory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        listingId: 'listing-id',
        fromStatus: 'DRAFT',
        toStatus: 'PENDING_REVIEW',
      }),
    });
  });
});
