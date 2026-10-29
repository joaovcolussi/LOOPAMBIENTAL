import {
  BadRequestException,
  Injectable,
  Optional,
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
import { createAntivirusProvider } from './file-scanner';
import { FileRegistryService, UploadContext } from './file-registry.service';
const sharp = require('sharp') as typeof import('sharp').default;

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;
type DocumentPrefix = 'company-documents' | 'listing-documents';

@Injectable()
export class ListingMediaStorageService {
  private readonly bucket: string;
  private readonly client: S3Client;
  private readonly production = process.env.NODE_ENV === 'production';
  private bucketReady: Promise<void> | null = null;
  private readonly scanner = createAntivirusProvider();

  constructor(@Optional() private readonly registry?: FileRegistryService) {
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

  async upload(file: Express.Multer.File, context?: UploadContext) {
    return this.uploadImage(file, 'listings', false, context);
  }

  async uploadCarousel(file: Express.Multer.File, context?: UploadContext) {
    return this.uploadImage(file, 'home-carousel', true, context);
  }

  /**
   * Scans the original bytes before anything is stored. Rejected uploads are
   * still recorded in the file registry for the security team.
   */
  private async scan(
    buffer: Buffer,
    context: UploadContext | undefined,
    accessLevel: 'PUBLIC' | 'PRIVATE',
  ) {
    const verdict = await this.scanner.scan(buffer);
    if (!verdict.clean) {
      if (context)
        await this.registry?.record(
          context,
          {
            storageKey: `rejected/${randomUUID()}`,
            mimeType: 'application/octet-stream',
            sizeBytes: buffer.length,
            sha256: createHash('sha256').update(buffer).digest('hex'),
            accessLevel,
          },
          verdict,
        );
      throw new BadRequestException('UPLOAD_REJECTED_BY_SCANNER');
    }
    return verdict;
  }

  async uploadDocument(
    file: Express.Multer.File,
    prefix: DocumentPrefix = 'company-documents',
    context?: UploadContext,
  ) {
    if (!file.buffer?.length || file.size > MAX_DOCUMENT_SIZE)
      throw new BadRequestException('INVALID_DOCUMENT_SIZE');
    const verdict = await this.scan(file.buffer, context, 'PRIVATE');
    const detected = await this.detectDocument(file.buffer);
    await this.ensureBucket();
    const storageKey = `${prefix}/${randomUUID()}.${detected.extension}`;
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: storageKey,
          Body: detected.buffer,
          ContentLength: detected.buffer.length,
          ContentType: detected.mimeType,
          ContentDisposition: 'attachment',
        }),
      );
    } catch {
      throw new ServiceUnavailableException('STORAGE_UNAVAILABLE');
    }
    const stored = {
      fileName: this.withExtension(
        this.sanitizeFileName(file.originalname),
        detected.extension,
      ),
      storageKey,
      mimeType: detected.mimeType,
      sizeBytes: detected.buffer.length,
      sha256: createHash('sha256').update(detected.buffer).digest('hex'),
    };
    if (context)
      await this.registry?.record(
        context,
        { ...stored, accessLevel: 'PRIVATE' },
        verdict,
      );
    return stored;
  }

  private async detectDocument(buffer: Buffer) {
    if (buffer.subarray(0, 5).toString('latin1') === '%PDF-') {
      return {
        buffer,
        mimeType: 'application/pdf',
        extension: 'pdf',
      };
    }
    try {
      const image = sharp(buffer, {
        failOn: 'warning',
        limitInputPixels: 25_000_000,
      });
      const metadata = await image.metadata();
      if (
        !metadata.format ||
        !['jpeg', 'png', 'webp'].includes(metadata.format) ||
        (metadata.pages ?? 1) > 1
      )
        throw new Error('UNSUPPORTED_DOCUMENT');
      const sanitized = await image
        .rotate()
        .resize({
          width: 2200,
          height: 2200,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 84 })
        .toBuffer();
      return {
        buffer: sanitized,
        mimeType: 'image/webp',
        extension: 'webp',
      };
    } catch {
      throw new BadRequestException('INVALID_DOCUMENT_TYPE');
    }
  }

  // Images are re-encoded to WebP, so the download name must follow suit.
  private withExtension(fileName: string, extension: string) {
    const base = fileName.replace(/\.[^.]*$/, '') || 'documento';
    return `${base.slice(0, 250)}.${extension}`;
  }

  private sanitizeFileName(value: string) {
    const base = value.split(/[\\/]/).pop() ?? 'documento';
    // Keep accented letters (e.g. "Laudo técnico.pdf"); drop control and
    // path characters. Content-Disposition encodes the name safely.
    const clean = base
      .normalize('NFC')
      .replace(/[^\p{L}\p{N}._\- ()]+/gu, '_')
      .trim();
    return (clean || 'documento').slice(0, 255);
  }

  private async uploadImage(
    file: Express.Multer.File,
    prefix: 'listings' | 'home-carousel',
    carousel: boolean,
    context?: UploadContext,
  ) {
    if (!file.buffer?.length || file.size > MAX_IMAGE_SIZE)
      throw new BadRequestException('INVALID_IMAGE_SIZE');
    const verdict = await this.scan(file.buffer, context, 'PUBLIC');
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
    const stored = {
      storageKey,
      mimeType: 'image/webp',
      sizeBytes: sanitized.length,
      sha256: createHash('sha256').update(sanitized).digest('hex'),
    };
    if (context)
      await this.registry?.record(
        context,
        { ...stored, accessLevel: 'PUBLIC' },
        verdict,
      );
    return stored;
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
