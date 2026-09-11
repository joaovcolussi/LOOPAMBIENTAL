import { ListingMediaStorageService } from '../src/infrastructure/listing-media-storage.service';
const sharp = require('sharp') as typeof import('sharp').default;

describe('ListingMediaStorageService', () => {
  it('rejects content that is not a decodable allowed image', async () => {
    const service = new ListingMediaStorageService();
    const file = {
      buffer: Buffer.from('not-an-image'),
      size: 12,
    } as Express.Multer.File;

    await expect(service.upload(file)).rejects.toThrow('INVALID_IMAGE_TYPE');
  });

  it('rejects images above the upload limit before storage', async () => {
    const service = new ListingMediaStorageService();
    const file = {
      buffer: Buffer.from('x'),
      size: 5 * 1024 * 1024 + 1,
    } as Express.Multer.File;

    await expect(service.upload(file)).rejects.toThrow('INVALID_IMAGE_SIZE');
  });

  it('sanitizes a valid carousel image to WebP', async () => {
    const service = new ListingMediaStorageService();
    const internals = service as unknown as {
      ensureBucket: () => Promise<void>;
      client: { send: () => Promise<object> };
    };
    internals.ensureBucket = jest.fn().mockResolvedValue(undefined);
    internals.client = { send: jest.fn().mockResolvedValue({}) };
    const buffer = await sharp({
      create: {
        width: 1600,
        height: 1000,
        channels: 3,
        background: '#2f775c',
      },
    })
      .png()
      .toBuffer();

    await expect(
      service.uploadCarousel({
        buffer,
        size: buffer.length,
      } as Express.Multer.File),
    ).resolves.toEqual(expect.objectContaining({ mimeType: 'image/webp' }));
  });
});
