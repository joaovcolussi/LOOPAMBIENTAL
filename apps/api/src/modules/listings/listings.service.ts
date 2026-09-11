import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../infrastructure/prisma.service';
import { ListingMediaStorageService } from '../../infrastructure/listing-media-storage.service';

export type ListingInput = {
  companyId: string;
  categoryId: string;
  materialId?: string;
  type: 'BUY' | 'SELL';
  title: string;
  description?: string;
  quantity: string;
  unit: string;
  unitPrice?: string;
  frequency?: 'ONE_TIME' | 'WEEKLY' | 'MONTHLY' | 'CONTINUOUS';
  riskClassification?: 'NON_HAZARDOUS' | 'HAZARDOUS' | 'UNKNOWN';
  originDetails?: string;
  ownTransport?: boolean;
  requiresDocuments?: boolean;
  city?: string;
  state?: string;
};

const listingSelect = {
  id: true,
  companyId: true,
  type: true,
  status: true,
  title: true,
  slug: true,
  description: true,
  quantity: true,
  availableQuantity: true,
  unit: true,
  unitPrice: true,
  currency: true,
  city: true,
  state: true,
  frequency: true,
  riskClassification: true,
  originDetails: true,
  ownTransport: true,
  requiresDocuments: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  lastAccessAt: true,
  company: {
    select: { id: true, legalName: true, tradeName: true, verification: true },
  },
  createdBy: { select: { id: true, name: true } },
  category: { select: { id: true, name: true, slug: true } },
  material: { select: { id: true, name: true, slug: true } },
  media: {
    where: { status: 'READY' as const },
    orderBy: { sortOrder: 'asc' as const },
    select: { id: true, altText: true, sortOrder: true },
  },
} as const;

const listingDetailSelect = {
  ...listingSelect,
  company: {
    select: {
      id: true,
      legalName: true,
      tradeName: true,
      description: true,
      city: true,
      state: true,
      verification: true,
      contactName: true,
      contactEmail: true,
      contactWhatsapp: true,
      addressLine: true,
      addressNumber: true,
      addressDistrict: true,
      addressPostalCode: true,
      contactVisibility: true,
    },
  },
} as const;

@Injectable()
export class ListingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaStorage: ListingMediaStorageService,
  ) {}

  async findForUser(userId: string): Promise<unknown> {
    const memberships = await this.prisma.companyMember.findMany({
      where: { userId },
      select: { companyId: true },
    });
    const companyIds = memberships.map((m) => m.companyId);
    if (companyIds.length === 0) return [];
    return this.prisma.listing.findMany({
      where: { companyId: { in: companyIds }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: listingSelect,
    });
  }

  async findForUserById(userId: string, id: string): Promise<unknown> {
    const listing = await this.getListing(id);
    await this.assertCanManage(
      userId,
      listing.companyId,
      listing.createdByUserId,
    );
    return this.prisma.listing.findUnique({
      where: { id },
      select: listingDetailSelect,
    });
  }

  async findPublishedBySlug(slug: string): Promise<unknown> {
    const listing = await this.prisma.listing.findFirst({
      where: { slug, status: 'PUBLISHED', deletedAt: null },
      select: listingDetailSelect,
    });
    if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');
    const lastAccessAt = new Date();
    await this.prisma.listing.update({
      where: { id: listing.id },
      data: { lastAccessAt, viewCount: { increment: 1 } },
    });
    const contactIsPublic = listing.company.contactVisibility === 'PUBLIC';
    return {
      ...listing,
      lastAccessAt,
      company: {
        id: listing.company.id,
        legalName: listing.company.legalName,
        tradeName: listing.company.tradeName,
        description: listing.company.description,
        city: listing.company.city,
        state: listing.company.state,
        verification: listing.company.verification,
        contactVisibility: listing.company.contactVisibility,
        contact: contactIsPublic
          ? {
              name: listing.company.contactName,
              email: listing.company.contactEmail,
              whatsapp: listing.company.contactWhatsapp,
              addressLine: listing.company.addressLine,
              addressNumber: listing.company.addressNumber,
              addressDistrict: listing.company.addressDistrict,
              addressPostalCode: listing.company.addressPostalCode,
            }
          : null,
      },
    };
  }

  async create(userId: string, input: ListingInput): Promise<unknown> {
    await this.assertMembership(userId, input.companyId);
    await this.assertCatalog(input.categoryId, input.materialId);
    const quantity = this.parsePositiveDecimal(
      input.quantity,
      'INVALID_QUANTITY',
    );
    return this.prisma.listing.create({
      data: {
        companyId: input.companyId,
        createdByUserId: userId,
        categoryId: input.categoryId,
        materialId: input.materialId,
        type: input.type,
        title: input.title,
        slug: `${this.slugify(input.title)}-${randomUUID().slice(0, 8)}`,
        description: input.description,
        quantity,
        availableQuantity: quantity,
        unit: input.unit,
        unitPrice: input.unitPrice
          ? this.parsePositiveDecimal(input.unitPrice, 'INVALID_PRICE', 2, 12)
          : undefined,
        frequency: input.frequency,
        riskClassification: input.riskClassification,
        originDetails: input.originDetails,
        ownTransport: input.ownTransport,
        requiresDocuments: input.requiresDocuments,
        city: input.city,
        state: input.state?.toUpperCase(),
      },
      select: listingSelect,
    });
  }

  async addMedia(
    userId: string,
    id: string,
    files: Express.Multer.File[],
  ): Promise<unknown> {
    const listing = await this.getListing(id);
    await this.assertCanManage(
      userId,
      listing.companyId,
      listing.createdByUserId,
    );
    if (listing.status === 'CLOSED' || listing.status === 'ARCHIVED')
      throw new BadRequestException('LISTING_NOT_EDITABLE');
    if (files.length < 1) throw new BadRequestException('IMAGES_REQUIRED');
    const existingCount = await this.prisma.listingMedia.count({
      where: { listingId: id, status: 'READY' },
    });
    if (existingCount + files.length > 5)
      throw new BadRequestException('IMAGE_LIMIT_EXCEEDED');

    const uploads: {
      storageKey: string;
      mimeType: string;
      sizeBytes: number;
      sha256: string;
    }[] = [];
    try {
      for (const file of files)
        uploads.push(await this.mediaStorage.upload(file));

      return await this.prisma.$transaction(async (transaction) => {
        const media = await Promise.all(
          uploads.map((upload, index) =>
            transaction.listingMedia.create({
              data: {
                listingId: id,
                uploadedByUserId: userId,
                ...upload,
                altText: listing.title,
                sortOrder: existingCount + index,
              },
              select: { id: true, altText: true, sortOrder: true },
            }),
          ),
        );
        if (listing.status === 'PUBLISHED') {
          await transaction.listing.update({
            where: { id },
            data: { status: 'PENDING_REVIEW', publishedAt: null },
          });
          await transaction.moderationCase.create({ data: { listingId: id } });
        }
        return media;
      });
    } catch (error) {
      await Promise.all(
        uploads.map((upload) => this.mediaStorage.remove(upload.storageKey)),
      );
      throw error;
    }
  }

  async readPublishedMedia(mediaId: string) {
    const media = await this.prisma.listingMedia.findFirst({
      where: {
        id: mediaId,
        status: 'READY',
        listing: { status: 'PUBLISHED', deletedAt: null },
      },
      select: { storageKey: true, mimeType: true },
    });
    if (!media) throw new NotFoundException('LISTING_MEDIA_NOT_FOUND');
    return {
      buffer: await this.mediaStorage.read(media.storageKey),
      mimeType: media.mimeType,
    };
  }

  async readOwnedMedia(userId: string, mediaId: string) {
    const media = await this.prisma.listingMedia.findFirst({
      where: { id: mediaId, status: 'READY' },
      select: {
        storageKey: true,
        mimeType: true,
        listing: {
          select: { companyId: true, createdByUserId: true },
        },
      },
    });
    if (!media) throw new NotFoundException('LISTING_MEDIA_NOT_FOUND');
    await this.assertCanManage(
      userId,
      media.listing.companyId,
      media.listing.createdByUserId,
    );
    return {
      buffer: await this.mediaStorage.read(media.storageKey),
      mimeType: media.mimeType,
    };
  }

  async readModerationMedia(mediaId: string) {
    const media = await this.prisma.listingMedia.findFirst({
      where: {
        id: mediaId,
        status: 'READY',
        listing: {
          moderationCases: { some: { status: { in: ['OPEN', 'IN_REVIEW'] } } },
        },
      },
      select: { storageKey: true, mimeType: true },
    });
    if (!media) throw new NotFoundException('LISTING_MEDIA_NOT_FOUND');
    return {
      buffer: await this.mediaStorage.read(media.storageKey),
      mimeType: media.mimeType,
    };
  }

  async update(
    userId: string,
    id: string,
    input: Partial<ListingInput>,
  ): Promise<unknown> {
    const listing = await this.getListing(id);
    await this.assertCanManage(
      userId,
      listing.companyId,
      listing.createdByUserId,
    );
    if (listing.status === 'CLOSED' || listing.status === 'ARCHIVED')
      throw new BadRequestException('LISTING_NOT_EDITABLE');
    if (input.categoryId || input.materialId !== undefined) {
      await this.assertCatalog(
        input.categoryId ?? listing.categoryId,
        input.materialId === undefined
          ? (listing.materialId ?? undefined)
          : input.materialId,
      );
    }
    const quantity = input.quantity
      ? this.parsePositiveDecimal(input.quantity, 'INVALID_QUANTITY')
      : undefined;
    return this.prisma.$transaction(async (transaction) => {
      const changed = await transaction.listing.updateMany({
        where: { id, status: listing.status },
        data: {
          ...(input.categoryId ? { categoryId: input.categoryId } : {}),
          ...(input.materialId !== undefined
            ? { materialId: input.materialId || null }
            : {}),
          ...(input.type ? { type: input.type } : {}),
          ...(input.title
            ? {
                title: input.title,
                slug: `${this.slugify(input.title)}-${randomUUID().slice(0, 8)}`,
              }
            : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(quantity ? { quantity, availableQuantity: quantity } : {}),
          ...(input.unit ? { unit: input.unit } : {}),
          ...(input.unitPrice !== undefined
            ? {
                unitPrice: input.unitPrice
                  ? this.parsePositiveDecimal(
                      input.unitPrice,
                      'INVALID_PRICE',
                      2,
                      12,
                    )
                  : null,
              }
            : {}),
          ...(input.frequency ? { frequency: input.frequency } : {}),
          ...(input.riskClassification
            ? { riskClassification: input.riskClassification }
            : {}),
          ...(input.originDetails !== undefined
            ? { originDetails: input.originDetails }
            : {}),
          ...(input.ownTransport !== undefined
            ? { ownTransport: input.ownTransport }
            : {}),
          ...(input.requiresDocuments !== undefined
            ? { requiresDocuments: input.requiresDocuments }
            : {}),
          ...(input.city !== undefined ? { city: input.city } : {}),
          ...(input.state !== undefined
            ? { state: input.state.toUpperCase() }
            : {}),
          ...(listing.status === 'PUBLISHED'
            ? { status: 'PENDING_REVIEW', publishedAt: null }
            : {}),
        },
      });
      if (changed.count !== 1)
        throw new ConflictException('LISTING_STATE_CHANGED');
      if (listing.status === 'PUBLISHED')
        await transaction.moderationCase.create({ data: { listingId: id } });
      return transaction.listing.findUniqueOrThrow({
        where: { id },
        select: listingSelect,
      });
    });
  }

  async submit(userId: string, id: string): Promise<unknown> {
    const listing = await this.getListing(id);
    await this.assertCanManage(
      userId,
      listing.companyId,
      listing.createdByUserId,
    );
    if (!['DRAFT', 'REJECTED', 'PAUSED'].includes(listing.status))
      throw new BadRequestException('INVALID_LISTING_TRANSITION');
    return this.prisma.$transaction(async (transaction) => {
      const changed = await transaction.listing.updateMany({
        where: { id, status: listing.status },
        data: { status: 'PENDING_REVIEW' },
      });
      if (changed.count !== 1)
        throw new ConflictException('LISTING_STATE_CHANGED');
      await transaction.moderationCase.create({ data: { listingId: id } });
      return transaction.listing.findUniqueOrThrow({
        where: { id },
        select: listingSelect,
      });
    });
  }

  async pause(userId: string, id: string): Promise<unknown> {
    const listing = await this.getListing(id);
    await this.assertCanManage(
      userId,
      listing.companyId,
      listing.createdByUserId,
    );
    if (listing.status !== 'PUBLISHED' && listing.status !== 'NEGOTIATING')
      throw new BadRequestException('INVALID_LISTING_TRANSITION');
    return this.prisma.listing.update({
      where: { id },
      data: { status: 'PAUSED' },
      select: listingSelect,
    });
  }

  async close(userId: string, id: string): Promise<unknown> {
    const listing = await this.getListing(id);
    await this.assertCanManage(
      userId,
      listing.companyId,
      listing.createdByUserId,
    );
    if (listing.status === 'CLOSED' || listing.status === 'ARCHIVED')
      throw new BadRequestException('INVALID_LISTING_TRANSITION');
    return this.prisma.listing.update({
      where: { id },
      data: { status: 'CLOSED' },
      select: listingSelect,
    });
  }

  private async getListing(id: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { id, deletedAt: null },
    });
    if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');
    return listing;
  }
  private async assertMembership(userId: string, companyId: string) {
    const membership = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
    if (!membership) throw new ForbiddenException('COMPANY_ACCESS_DENIED');
  }
  private async assertCanManage(
    userId: string,
    companyId: string,
    creatorId: string,
    adminOnly = false,
  ) {
    const membership = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
    if (!membership) throw new ForbiddenException('COMPANY_ACCESS_DENIED');
    if (adminOnly && membership.role !== 'OWNER' && membership.role !== 'ADMIN')
      throw new ForbiddenException('COMPANY_MANAGEMENT_REQUIRED');
    if (!adminOnly && membership.role === 'MEMBER' && creatorId !== userId)
      throw new ForbiddenException('LISTING_MANAGEMENT_REQUIRED');
  }
  private async assertCatalog(categoryId: string, materialId?: string) {
    if (
      !(await this.prisma.wasteCategory.findUnique({
        where: { id: categoryId },
      }))
    )
      throw new BadRequestException('CATEGORY_NOT_FOUND');
    if (
      materialId &&
      !(await this.prisma.material.findFirst({
        where: { id: materialId, categoryId },
      }))
    )
      throw new BadRequestException('MATERIAL_NOT_FOUND');
  }
  private parsePositiveDecimal(
    value: string,
    code: string,
    scale = 3,
    maxIntegerDigits = 13,
  ) {
    const pattern = new RegExp(
      `^\\d{1,${maxIntegerDigits}}(\\.\\d{1,${scale}})?$`,
    );
    if (
      !pattern.test(value) ||
      !Number.isFinite(Number(value)) ||
      Number(value) <= 0
    )
      throw new BadRequestException(code);
    return value;
  }
  private slugify(value: string) {
    return (
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 180) || 'anuncio'
    );
  }
}
