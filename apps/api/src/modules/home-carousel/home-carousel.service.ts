import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import { ListingMediaStorageService } from '../../infrastructure/listing-media-storage.service';

const slideSelect = {
  id: true,
  position: true,
  altText: true,
  sha256: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  updatedBy: { select: { id: true, name: true } },
} as const;

@Injectable()
export class HomeCarouselService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ListingMediaStorageService,
  ) {}

  listPublic() {
    return this.prisma.homeCarouselSlide.findMany({
      orderBy: { position: 'asc' },
      select: {
        id: true,
        position: true,
        altText: true,
        sha256: true,
      },
    });
  }

  listAdmin() {
    return this.prisma.homeCarouselSlide.findMany({
      orderBy: { position: 'asc' },
      select: slideSelect,
    });
  }

  async replace(
    actorUserId: string,
    position: number,
    expectedVersion: number,
    altText: string,
    file: Express.Multer.File,
  ) {
    this.validatePosition(position);
    const normalizedAlt = altText.trim();
    if (normalizedAlt.length < 3 || normalizedAlt.length > 180)
      throw new BadRequestException('INVALID_CAROUSEL_ALT_TEXT');
    const existing = await this.prisma.homeCarouselSlide.findUnique({
      where: { position },
    });
    if ((existing?.version ?? 0) !== expectedVersion)
      throw new ConflictException('CAROUSEL_SLIDE_CONFLICT');

    const upload = await this.storage.uploadCarousel(file);
    try {
      const slide = await this.prisma.$transaction(async (transaction) => {
        if (existing) {
          const changed = await transaction.homeCarouselSlide.updateMany({
            where: { id: existing.id, version: expectedVersion },
            data: {
              ...upload,
              altText: normalizedAlt,
              updatedByUserId: actorUserId,
              version: { increment: 1 },
            },
          });
          if (changed.count !== 1)
            throw new ConflictException('CAROUSEL_SLIDE_CONFLICT');
        } else {
          await transaction.homeCarouselSlide.create({
            data: {
              position,
              ...upload,
              altText: normalizedAlt,
              updatedByUserId: actorUserId,
            },
          });
        }
        const updated = await transaction.homeCarouselSlide.findUniqueOrThrow({
          where: { position },
          select: slideSelect,
        });
        await transaction.auditLog.create({
          data: {
            actorUserId,
            action: existing ? 'CAROUSEL_IMAGE_REPLACED' : 'CAROUSEL_CREATED',
            resourceType: 'HOME_CAROUSEL_SLIDE',
            resourceId: updated.id,
            metadata: {
              position,
              previousSha256: existing?.sha256 ?? null,
              previousAltText: existing?.altText ?? null,
              previousVersion: existing?.version ?? 0,
              sha256: upload.sha256,
              altText: normalizedAlt,
              version: updated.version,
            },
          },
        });
        return updated;
      });
      if (existing) await this.storage.remove(existing.storageKey);
      return slide;
    } catch (error) {
      await this.storage.remove(upload.storageKey);
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      )
        throw new ConflictException('CAROUSEL_SLIDE_CONFLICT');
      throw error;
    }
  }

  async reset(actorUserId: string, position: number, expectedVersion: number) {
    this.validatePosition(position);
    const existing = await this.prisma.homeCarouselSlide.findUnique({
      where: { position },
    });
    if (!existing) return { position, reset: true };
    if (existing.version !== expectedVersion)
      throw new ConflictException('CAROUSEL_SLIDE_CONFLICT');
    await this.prisma.$transaction(async (transaction) => {
      const removed = await transaction.homeCarouselSlide.deleteMany({
        where: { id: existing.id, version: expectedVersion },
      });
      if (removed.count !== 1)
        throw new ConflictException('CAROUSEL_SLIDE_CONFLICT');
      await transaction.auditLog.create({
        data: {
          actorUserId,
          action: 'CAROUSEL_RESET',
          resourceType: 'HOME_CAROUSEL_SLIDE',
          resourceId: existing.id,
          metadata: { position, previousSha256: existing.sha256 },
        },
      });
    });
    await this.storage.remove(existing.storageKey);
    return { position, reset: true };
  }

  async read(position: number, sha256: string) {
    this.validatePosition(position);
    const slide = await this.prisma.homeCarouselSlide.findFirst({
      where: { position, sha256 },
      select: { storageKey: true, mimeType: true, sha256: true },
    });
    if (!slide) throw new NotFoundException('CAROUSEL_SLIDE_NOT_FOUND');
    return {
      buffer: await this.storage.read(slide.storageKey),
      mimeType: slide.mimeType,
      sha256: slide.sha256,
    };
  }

  private validatePosition(position: number) {
    if (!Number.isInteger(position) || position < 1 || position > 4)
      throw new BadRequestException('INVALID_CAROUSEL_POSITION');
  }
}
