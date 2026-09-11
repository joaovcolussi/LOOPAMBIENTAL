import { HomeCarouselService } from '../src/modules/home-carousel/home-carousel.service';

describe('HomeCarouselService', () => {
  it('replaces a slide atomically and removes the previous object', async () => {
    const existing = {
      id: 'slide-id',
      position: 1,
      version: 2,
      storageKey: 'home-carousel/old.webp',
      sha256: 'old-hash',
    };
    const updated = { id: 'slide-id', position: 1, version: 3 };
    const transaction = {
      homeCarouselSlide: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest.fn().mockResolvedValue(updated),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      homeCarouselSlide: { findUnique: jest.fn().mockResolvedValue(existing) },
      $transaction: jest.fn((callback) => callback(transaction)),
    };
    const storage = {
      uploadCarousel: jest.fn().mockResolvedValue({
        storageKey: 'home-carousel/new.webp',
        mimeType: 'image/webp',
        sizeBytes: 100,
        sha256: 'new-hash',
      }),
      remove: jest.fn().mockResolvedValue(undefined),
    };
    const service = new HomeCarouselService(prisma as never, storage as never);

    await expect(
      service.replace('admin-id', 1, 2, 'Imagem de reciclagem', {} as never),
    ).resolves.toEqual(updated);
    expect(transaction.auditLog.create).toHaveBeenCalled();
    expect(storage.remove).toHaveBeenCalledWith('home-carousel/old.webp');
  });

  it('rejects a stale version before uploading', async () => {
    const prisma = {
      homeCarouselSlide: {
        findUnique: jest.fn().mockResolvedValue({ version: 4 }),
      },
    };
    const storage = { uploadCarousel: jest.fn() };
    const service = new HomeCarouselService(prisma as never, storage as never);

    await expect(
      service.replace('admin-id', 1, 3, 'Imagem de reciclagem', {} as never),
    ).rejects.toThrow('CAROUSEL_SLIDE_CONFLICT');
    expect(storage.uploadCarousel).not.toHaveBeenCalled();
  });
});
