import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createHash, randomUUID } from 'node:crypto';
const sharp = require('sharp') as typeof import('sharp').default;

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

@Injectable()
export class ListingMediaStorageService {
  private readonly bucket: string;
  private readonly client: S3Client;
  private readonly production = process.env.NODE_ENV === 'production';
  private bucketReady: Promise<void> | null = null;

  constructor() {
    const endpoint = process.env.STORAGE_ENDPOINT ?? 'http://localhost:9000';
    const accessKeyId = process.env.STORAGE_ACCESS_KEY ?? 'loopambiental';
    const secretAccessKey =
      process.env.STORAGE_SECRET_KEY ?? 'loopambiental_local';
    this.bucket = process.env.STORAGE_BUCKET ?? 'loopambiental-listings';
    if (
      this.production &&
      (!process.env.STORAGE_ENDPOINT ||
        !process.env.STORAGE_BUCKET ||
        !process.env.STORAGE_ACCESS_KEY ||
        !process.env.STORAGE_SECRET_KEY)
    )
      throw new Error('STORAGE_CONFIGURATION_REQUIRED');
    this.client = new S3Client({
      endpoint,
      region: process.env.STORAGE_REGION ?? 'us-east-1',
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async upload(file: Express.Multer.File) {
    return this.uploadImage(file, 'listings', false);
  }

  async uploadCarousel(file: Express.Multer.File) {
    return this.uploadImage(file, 'home-carousel', true);
  }

  private async uploadImage(
    file: Express.Multer.File,
    prefix: 'listings' | 'home-carousel',
    carousel: boolean,
  ) {
    if (!file.buffer?.length || file.size > MAX_IMAGE_SIZE)
      throw new BadRequestException('INVALID_IMAGE_SIZE');
    let sanitized: Buffer;
    try {
      const image = sharp(file.buffer, {
        failOn: 'warning',
        limitInputPixels: 25_000_000,
      });
      const metadata = await image.metadata();
      if (
        !metadata.format ||
        !['jpeg', 'png', 'webp'].includes(metadata.format) ||
        (metadata.pages ?? 1) > 1
      )
        throw new Error('UNSUPPORTED_IMAGE');
      sanitized = await image
        .rotate()
        .resize(
          carousel
            ? { width: 1600, height: 1000, fit: 'cover', position: 'centre' }
            : {
                width: 2200,
                height: 2200,
                fit: 'inside',
                withoutEnlargement: true,
              },
        )
        .webp({ quality: 84 })
        .toBuffer();
    } catch {
      throw new BadRequestException('INVALID_IMAGE_TYPE');
    }
    if (sanitized.length > MAX_IMAGE_SIZE)
      throw new BadRequestException('INVALID_IMAGE_SIZE');
    await this.ensureBucket();
    const storageKey = `${prefix}/${randomUUID()}.webp`;
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
          Body: sanitized,
          ContentLength: sanitized.length,
          ContentType: 'image/webp',
        }),
      );
    } catch {
      throw new ServiceUnavailableException('STORAGE_UNAVAILABLE');
    }
    return {
      storageKey,
      mimeType: 'image/webp',
      sizeBytes: sanitized.length,
      sha256: createHash('sha256').update(sanitized).digest('hex'),
    };
  }

  async read(storageKey: string) {
    try {
      const object = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: storageKey }),
      );
      if (!object.Body) throw new Error('EMPTY_OBJECT');
      return Buffer.from(await object.Body.transformToByteArray());
    } catch {
      throw new ServiceUnavailableException('STORAGE_UNAVAILABLE');
    }
  }

  async remove(storageKey: string) {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: storageKey }),
      );
    } catch {
      // Cleanup is best effort; inaccessible orphan objects are not exposed.
    }
  }

  private async ensureBucket() {
    if (!this.bucketReady) {
      this.bucketReady = (async () => {
        try {
          await this.client.send(
            new HeadBucketCommand({ Bucket: this.bucket }),
          );
        } catch (error) {
          if (this.production) throw error;
          await this.client.send(
            new CreateBucketCommand({ Bucket: this.bucket }),
          );
        }
      })().catch((error: unknown) => {
        this.bucketReady = null;
        throw error;
      });
    }
    try {
      await this.bucketReady;
    } catch {
      throw new ServiceUnavailableException('STORAGE_UNAVAILABLE');
    }
  }
}
