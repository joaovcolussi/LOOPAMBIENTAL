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
    const service = new ListingsService(prisma as never);

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
    const service = new ListingsService(prisma as never);

    await expect(service.submit('user-id', 'listing-id')).rejects.toThrow(
      'LISTING_MANAGEMENT_REQUIRED',
    );
  });
});
