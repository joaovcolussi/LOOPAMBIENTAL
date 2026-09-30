import { SavedSearchesService } from '../src/modules/saved-searches/saved-searches.service';

function makeService(prisma: unknown) {
  const notifications = { create: jest.fn().mockResolvedValue({}) };
  const service = new SavedSearchesService(
    prisma as never,
    notifications as never,
  );
  return { service, notifications };
}

describe('SavedSearchesService', () => {
  it('rejects a saved search without filters', async () => {
    const prisma = { savedSearch: { create: jest.fn() } };
    const { service } = makeService(prisma);

    await expect(
      service.create('user-id', {
        name: 'PET',
        filters: {},
        frequency: 'DAILY',
      }),
    ).rejects.toThrow('SAVED_SEARCH_FILTERS_REQUIRED');
    expect(prisma.savedSearch.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid name', async () => {
    const prisma = { savedSearch: { create: jest.fn() } };
    const { service } = makeService(prisma);

    await expect(
      service.create('user-id', { name: 'x', filters: { q: 'pet' } }),
    ).rejects.toThrow('INVALID_SAVED_SEARCH_NAME');
  });

  it('creates a saved search with normalized filters', async () => {
    const created = { id: 'saved-id', name: 'PET', frequency: 'DAILY' };
    const prisma = {
      savedSearch: { create: jest.fn().mockResolvedValue(created) },
    };
    const { service } = makeService(prisma);

    await expect(
      service.create('user-id', {
        name: ' PET ',
        filters: { q: ' pet ', type: 'SELL', state: 'sp' },
        frequency: 'DAILY',
      }),
    ).resolves.toEqual(created);
    expect(prisma.savedSearch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'PET',
          filters: { q: 'pet', type: 'SELL', state: 'SP' },
        }),
      }),
    );
  });

  it('only updates searches owned by the user', async () => {
    const prisma = {
      savedSearch: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    };
    const { service } = makeService(prisma);

    await expect(
      service.update('user-id', 'saved-id', { isActive: false }),
    ).rejects.toThrow('SAVED_SEARCH_NOT_FOUND');
    expect(prisma.savedSearch.update).not.toHaveBeenCalled();
  });

  it('notifies matches when running due alerts', async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const prisma = {
      savedSearch: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'saved-id',
            userId: 'user-id',
            name: 'PET',
            filters: { q: 'pet' },
            frequency: 'DAILY',
            lastProcessedAt: twoDaysAgo,
            createdAt: twoDaysAgo,
          },
        ]),
        update: jest.fn().mockResolvedValue({}),
      },
      listing: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'listing-id', title: 'PET cristal' }]),
      },
    };
    const { service, notifications } = makeService(prisma);

    await expect(service.runDueAlerts()).resolves.toEqual({
      processed: 1,
      notified: 1,
    });
    expect(notifications.create).toHaveBeenCalledWith(
      'user-id',
      expect.objectContaining({ type: 'SAVED_SEARCH_MATCH' }),
    );
  });

  it('skips alerts that are not due yet', async () => {
    const prisma = {
      savedSearch: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'saved-id',
            userId: 'user-id',
            name: 'PET',
            filters: { q: 'pet' },
            frequency: 'WEEKLY',
            lastProcessedAt: new Date(),
            createdAt: new Date(),
          },
        ]),
        update: jest.fn(),
      },
      listing: { findMany: jest.fn() },
    };
    const { service, notifications } = makeService(prisma);

    await expect(service.runDueAlerts()).resolves.toEqual({
      processed: 0,
      notified: 0,
    });
    expect(prisma.listing.findMany).not.toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });
});
