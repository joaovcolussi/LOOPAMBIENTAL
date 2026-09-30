import {
  ListingSearchService,
  normalizeListingSearchFilters,
} from '../src/modules/listings/listing-search.service';

describe('normalizeListingSearchFilters', () => {
  it('defaults to recent ordering without a query', () => {
    expect(normalizeListingSearchFilters({}).sort).toBe('recent');
  });

  it('trims the query and switches to relevance ranking', () => {
    const filters = normalizeListingSearchFilters({ q: '  PET  ' });
    expect(filters.q).toBe('PET');
    expect(filters.sort).toBe('relevance');
  });

  it('keeps an explicit recent sort even with a query', () => {
    expect(
      normalizeListingSearchFilters({ q: 'pet', sort: 'recent' }).sort,
    ).toBe('recent');
  });

  it('parses verified, state and price filters', () => {
    expect(
      normalizeListingSearchFilters({
        verified: 'true',
        state: 'sp',
        minPrice: '10.00',
        maxPrice: '99.50',
      }),
    ).toMatchObject({
      verified: true,
      state: 'SP',
      minPrice: '10.00',
      maxPrice: '99.50',
    });
  });

  it('drops invalid price values', () => {
    expect(normalizeListingSearchFilters({ minPrice: 'abc' }).minPrice).toBe(
      undefined,
    );
  });

  it('enables distance sort when coordinates are provided', () => {
    const filters = normalizeListingSearchFilters({
      latitude: '-23.55',
      longitude: '-46.63',
      radiusKm: '120',
      sort: 'distance',
    });
    expect(filters.near).toEqual({ latitude: -23.55, longitude: -46.63 });
    expect(filters.radiusKm).toBe(120);
    expect(filters.sort).toBe('distance');
  });

  it('defaults the radius when only coordinates are given', () => {
    const filters = normalizeListingSearchFilters({
      latitude: '-23.55',
      longitude: '-46.63',
    });
    expect(filters.radiusKm).toBe(50);
    expect(filters.sort).toBe('recent');
  });

  it('ignores invalid coordinates', () => {
    const filters = normalizeListingSearchFilters({
      latitude: '999',
      longitude: '-46.63',
      sort: 'distance',
    });
    expect(filters.near).toBeUndefined();
    expect(filters.sort).toBe('recent');
  });
});

describe('ListingSearchService', () => {
  it('returns ranked items, facets and a cursor', async () => {
    const publishedAt = new Date('2026-01-01T00:00:00.000Z');
    const queryRaw = jest
      .fn()
      .mockResolvedValueOnce([
        { id: 'l1', score: 2.5, rank_value: 25000n, published_at: publishedAt },
        { id: 'l2', score: 1.1, rank_value: 11000n, published_at: publishedAt },
      ])
      .mockResolvedValueOnce([{ total: 5n }])
      .mockResolvedValueOnce([
        { id: 'c1', name: 'Plástico', slug: 'plastico', total: 2n },
      ])
      .mockResolvedValueOnce([{ value: 'SELL', total: 2n }])
      .mockResolvedValueOnce([{ value: 'SP', total: 1n }]);
    const prisma = {
      $queryRaw: queryRaw,
      listing: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'l1', title: 'A' },
          { id: 'l2', title: 'B' },
        ]),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    const service = new ListingSearchService(prisma as never);

    const result = (await service.search({
      filters: normalizeListingSearchFilters({ q: 'pet' }),
      pageSize: 1,
    })) as {
      data: Array<{ id: string; score: number }>;
      pagination: {
        total: number;
        hasMore: boolean;
        nextCursor: string | null;
      };
      facets: { categories: Array<{ id: string; total: number }> };
    };

    expect(result.data.map((item) => item.id)).toEqual(['l1']);
    expect(result.data[0].score).toBe(2.5);
    expect(result.pagination.total).toBe(5);
    expect(result.pagination.hasMore).toBe(true);
    expect(result.pagination.nextCursor).toBeTruthy();
    expect(result.facets.categories).toEqual([
      { id: 'c1', name: 'Plástico', slug: 'plastico', total: 2 },
    ]);
  });

  it('rejects an invalid cursor', async () => {
    const service = new ListingSearchService({
      $queryRaw: jest.fn(),
    } as never);
    await expect(
      service.search({
        filters: normalizeListingSearchFilters({}),
        cursor: 'not-a-cursor',
        pageSize: 10,
      }),
    ).rejects.toThrow('INVALID_SEARCH_CURSOR');
  });
});
