import { ReviewsService } from '../src/modules/reviews/reviews.service';

function makeService(prisma: unknown, notifications?: unknown) {
  return new ReviewsService(
    prisma as never,
    (notifications ?? { create: jest.fn().mockResolvedValue({}) }) as never,
  );
}

describe('ReviewsService', () => {
  it('rejects ratings outside the 1..5 range', async () => {
    const service = makeService({});
    await expect(
      service.create('user-id', 'deal-id', {
        rating: 6,
        authorCompanyId: 'company-id',
      }),
    ).rejects.toThrow('INVALID_RATING');
  });

  it('rejects a review for a deal that is not completed', async () => {
    const prisma = {
      deal: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'deal-id',
          status: 'AWAITING_PAYMENT',
          buyerCompanyId: 'buyer-id',
          sellerCompanyId: 'seller-id',
        }),
      },
    };
    const service = makeService(prisma);
    await expect(
      service.create('user-id', 'deal-id', {
        rating: 5,
        authorCompanyId: 'buyer-id',
      }),
    ).rejects.toThrow('DEAL_NOT_COMPLETED');
  });

  it('rejects a review from a company that is not part of the deal', async () => {
    const prisma = {
      deal: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'deal-id',
          status: 'COMPLETED',
          buyerCompanyId: 'buyer-id',
          sellerCompanyId: 'seller-id',
        }),
      },
    };
    const service = makeService(prisma);
    await expect(
      service.create('user-id', 'deal-id', {
        rating: 5,
        authorCompanyId: 'outsider-id',
      }),
    ).rejects.toThrow('DEAL_ACCESS_DENIED');
  });

  it('creates a review, updates the aggregate and notifies the reviewed company', async () => {
    const created = {
      id: 'review-id',
      rating: 4,
      authorCompany: { id: 'buyer-id', legalName: 'Buyer', tradeName: null },
      reviewedCompany: {
        id: 'seller-id',
        legalName: 'Seller',
        tradeName: 'Seller',
      },
      authorUser: { id: 'user-id', name: 'Author' },
    };
    const transaction = {
      review: {
        create: jest.fn().mockResolvedValue(created),
        aggregate: jest.fn().mockResolvedValue({
          _avg: { rating: 4.5 },
          _count: { _all: 4 },
        }),
      },
      company: { update: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      deal: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'deal-id',
          status: 'COMPLETED',
          buyerCompanyId: 'buyer-id',
          sellerCompanyId: 'seller-id',
        }),
      },
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'OWNER' }),
        findMany: jest.fn().mockResolvedValue([{ userId: 'seller-owner' }]),
      },
      review: { findUnique: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn((callback) => callback(transaction)),
    };
    const notifications = { create: jest.fn().mockResolvedValue({}) };
    const service = makeService(prisma, notifications);

    await expect(
      service.create('user-id', 'deal-id', {
        rating: 4,
        authorCompanyId: 'buyer-id',
      }),
    ).resolves.toEqual(created);

    expect(transaction.company.update).toHaveBeenCalledWith({
      where: { id: 'seller-id' },
      data: expect.objectContaining({ ratingCount: 4 }),
    });
    expect(notifications.create).toHaveBeenCalledWith(
      'seller-owner',
      expect.objectContaining({ type: 'SYSTEM' }),
    );
  });

  it('blocks a duplicate review from the same company', async () => {
    const prisma = {
      deal: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'deal-id',
          status: 'COMPLETED',
          buyerCompanyId: 'buyer-id',
          sellerCompanyId: 'seller-id',
        }),
      },
      companyMember: {
        findUnique: jest.fn().mockResolvedValue({ role: 'OWNER' }),
      },
      review: { findUnique: jest.fn().mockResolvedValue({ id: 'review-id' }) },
    };
    const service = makeService(prisma);
    await expect(
      service.create('user-id', 'deal-id', {
        rating: 5,
        authorCompanyId: 'buyer-id',
      }),
    ).rejects.toThrow('REVIEW_ALREADY_EXISTS');
  });

  it('lists pending reviews only for deals without the company review', async () => {
    const prisma = {
      companyMember: {
        findMany: jest.fn().mockResolvedValue([{ companyId: 'buyer-id' }]),
      },
      deal: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'deal-id',
            buyerCompanyId: 'buyer-id',
            sellerCompanyId: 'seller-id',
            updatedAt: new Date('2026-05-01T00:00:00.000Z'),
            listing: { id: 'listing-id', title: 'Material', slug: 'material' },
            buyerCompany: {
              id: 'buyer-id',
              legalName: 'Buyer',
              tradeName: null,
            },
            sellerCompany: {
              id: 'seller-id',
              legalName: 'Seller',
              tradeName: null,
            },
            reviews: [],
          },
        ]),
      },
    };
    const service = makeService(prisma);
    const pending = (await service.pending('user-id')) as Array<{
      dealId: string;
      authorCompany: { id: string };
    }>;
    expect(pending).toHaveLength(1);
    expect(pending[0].authorCompany.id).toBe('buyer-id');
  });
});
