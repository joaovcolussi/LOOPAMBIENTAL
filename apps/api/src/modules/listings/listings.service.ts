import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@loopambiental/database';
import { PrismaService } from '../../infrastructure/prisma.service';
import { ListingMediaStorageService } from '../../infrastructure/listing-media-storage.service';
import {
  AttributeValueInput,
  listingAttributeSelect,
  normalizeAttributes,
  replaceListingAttributes,
} from './listing-attributes';

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
  latitude?: number;
  longitude?: number;
  attributes?: AttributeValueInput[];
};

export const LISTING_DOCUMENT_TYPES = [
  'TECHNICAL_REPORT',
  'LAB_ANALYSIS',
  'SAFETY_DATA_SHEET',
  'OTHER',
] as const;
export type ListingDocumentType = (typeof LISTING_DOCUMENT_TYPES)[number];
export type ListingDocumentInput = {
  type: ListingDocumentType;
  validUntil?: string;
};

const MAX_LISTING_PHOTOS = 5;
const MAX_LISTING_DOCUMENTS = 5;

export const listingDocumentSelect = {
  id: true,
  type: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  validUntil: true,
  createdAt: true,
} as const;

export const activeDocumentsWhere = {
  status: 'READY' as const,
  deletedAt: null,
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
    select: {
      id: true,
      slug: true,
      legalName: true,
      tradeName: true,
      verification: true,
    },
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
  categoryId: true,
  materialId: true,
  latitude: true,
  longitude: true,
  attributes: {
    orderBy: { attribute: { sortOrder: 'asc' as const } },
    select: listingAttributeSelect,
  },
  documents: {
    where: activeDocumentsWhere,
    orderBy: { createdAt: 'asc' as const },
    select: listingDocumentSelect,
  },
  company: {
    select: {
      id: true,
      slug: true,
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

const listingOwnerDetailSelect = {
  ...listingDetailSelect,
  statusHistory: {
    orderBy: { createdAt: 'asc' as const },
    select: {
      id: true,
      fromStatus: true,
      toStatus: true,
      reason: true,
      createdAt: true,
      actor: { select: { id: true, name: true } },
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
      select: listingOwnerDetailSelect,
    });
  }

  async findPublishedBySlug(
    slug: string,
    viewerUserId?: string,
  ): Promise<unknown> {
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
    const unlock = viewerUserId
      ? await this.prisma.contactUnlock.findFirst({
          where: {
            listingId: listing.id,
            company: { members: { some: { userId: viewerUserId } } },
          },
          select: { id: true },
        })
      : null;
    const contactUnlocked = contactIsPublic || Boolean(unlock);
    return {
      ...listing,
      lastAccessAt,
      contactUnlocked,
      unlockRequired: !contactUnlocked,
      company: {
        id: listing.company.id,
        slug: listing.company.slug,
        legalName: listing.company.legalName,
        tradeName: listing.company.tradeName,
        description: listing.company.description,
        city: listing.company.city,
        state: listing.company.state,
        verification: listing.company.verification,
        contactVisibility: listing.company.contactVisibility,
        contact: contactUnlocked
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
    const attributes = input.attributes
      ? await this.validateAttributes(input.categoryId, input.attributes)
      : [];
    return this.prisma.$transaction(async (transaction) => {
      const listing = await transaction.listing.create({
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
          latitude: input.latitude,
          longitude: input.longitude,
        },
        select: listingSelect,
      });
      await transaction.listingStatusHistory.create({
        data: {
          listingId: listing.id,
          fromStatus: null,
          toStatus: 'DRAFT',
          actorUserId: userId,
          reason: 'LISTING_CREATED',
        },
      });
      if (attributes.length)
        await replaceListingAttributes(transaction, listing.id, attributes);
      return listing;
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
    if (existingCount + files.length > MAX_LISTING_PHOTOS)
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
        if (listing.status === 'PUBLISHED')
          await this.returnToReview(
            transaction,
            id,
            userId,
            'LISTING_MEDIA_ADDED',
          );
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

  async addDocument(
    userId: string,
    id: string,
    file: Express.Multer.File | undefined,
    input: ListingDocumentInput,
  ): Promise<unknown> {
    const listing = await this.getListing(id);
    await this.assertCanManage(
      userId,
      listing.companyId,
      listing.createdByUserId,
    );
    if (listing.status === 'CLOSED' || listing.status === 'ARCHIVED')
      throw new BadRequestException('LISTING_NOT_EDITABLE');
    if (!file) throw new BadRequestException('DOCUMENT_REQUIRED');
    const validUntil = this.parseOptionalDate(input.validUntil);
    // Cheap pre-check before the upload; the authoritative check runs again
    // under the listing row lock below.
    if (
      (await this.prisma.listingDocument.count({
        where: { listingId: id, ...activeDocumentsWhere },
      })) >= MAX_LISTING_DOCUMENTS
    )
      throw new BadRequestException('DOCUMENT_LIMIT_EXCEEDED');

    const upload = await this.mediaStorage.uploadDocument(
      file,
      'listing-documents',
    );
    try {
      return await this.prisma.$transaction(async (transaction) => {
        // Serializes concurrent uploads to the same listing so the limit holds.
        await transaction.$queryRaw`SELECT id FROM listings WHERE id = ${id} FOR UPDATE`;
        const existing = await transaction.listingDocument.count({
          where: { listingId: id, ...activeDocumentsWhere },
        });
        if (existing >= MAX_LISTING_DOCUMENTS)
          throw new BadRequestException('DOCUMENT_LIMIT_EXCEEDED');
        const document = await transaction.listingDocument.create({
          data: {
            listingId: id,
            uploadedByUserId: userId,
            type: input.type,
            validUntil,
            ...upload,
          },
          select: listingDocumentSelect,
        });
        if (listing.status === 'PUBLISHED')
          await this.returnToReview(
            transaction,
            id,
            userId,
            'LISTING_DOCUMENT_ADDED',
          );
        return document;
      });
    } catch (error) {
      await this.mediaStorage.remove(upload.storageKey);
      throw error;
    }
  }

  async removeDocument(
    userId: string,
    listingId: string,
    documentId: string,
  ): Promise<void> {
    const listing = await this.getListing(listingId);
    await this.assertCanManage(
      userId,
      listing.companyId,
      listing.createdByUserId,
    );
    if (listing.status === 'CLOSED' || listing.status === 'ARCHIVED')
      throw new BadRequestException('LISTING_NOT_EDITABLE');
    await this.prisma.$transaction(async (transaction) => {
      // Soft delete: the report may back an existing negotiation, so the file
      // and its metadata are retained for audit but no longer listed or served.
      const removed = await transaction.listingDocument.updateMany({
        where: { id: documentId, listingId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (removed.count !== 1)
        throw new NotFoundException('LISTING_DOCUMENT_NOT_FOUND');
      // The listing may have been approved because of this report.
      if (listing.status === 'PUBLISHED')
        await this.returnToReview(
          transaction,
          listingId,
          userId,
          'LISTING_DOCUMENT_REMOVED',
        );
    });
  }

  /**
   * Any signed-in user can read reports of a published listing; once the
   * listing is under negotiation only companies with an accepted proposal keep
   * access, so the counterparty can still check the material.
   */
  async readPublishedDocument(userId: string, documentId: string) {
    return this.readDocument({
      id: documentId,
      listing: {
        deletedAt: null,
        OR: [
          { status: 'PUBLISHED' },
          {
            status: 'NEGOTIATING',
            proposals: {
              some: {
                status: 'ACCEPTED',
                proposerCompany: { members: { some: { userId } } },
              },
            },
          },
        ],
      },
    });
  }

  async readOwnedDocument(userId: string, documentId: string) {
    const document = await this.prisma.listingDocument.findFirst({
      where: { id: documentId, ...activeDocumentsWhere },
      select: {
        storageKey: true,
        mimeType: true,
        fileName: true,
        listing: { select: { companyId: true, createdByUserId: true } },
      },
    });
    if (!document) throw new NotFoundException('LISTING_DOCUMENT_NOT_FOUND');
    await this.assertCanManage(
      userId,
      document.listing.companyId,
      document.listing.createdByUserId,
    );
    return this.loadDocument(document);
  }

  async readModerationDocument(documentId: string) {
    return this.readDocument({
      id: documentId,
      listing: {
        moderationCases: { some: { status: { in: ['OPEN', 'IN_REVIEW'] } } },
      },
    });
  }

  private async readDocument(where: Prisma.ListingDocumentWhereInput) {
    const document = await this.prisma.listingDocument.findFirst({
      where: { ...where, ...activeDocumentsWhere },
      select: { storageKey: true, mimeType: true, fileName: true },
    });
    if (!document) throw new NotFoundException('LISTING_DOCUMENT_NOT_FOUND');
    return this.loadDocument(document);
  }

  private async loadDocument(document: {
    storageKey: string;
    mimeType: string;
    fileName: string;
  }) {
    return {
      buffer: await this.mediaStorage.read(document.storageKey),
      mimeType: document.mimeType,
      fileName: document.fileName,
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
    const targetCategoryId = input.categoryId ?? listing.categoryId;
    const categoryChanged = targetCategoryId !== listing.categoryId;
    const attributes = input.attributes
      ? await this.validateAttributes(targetCategoryId, input.attributes)
      : null;
    // A listing under negotiation has committed stock reserved by the accepted
    // proposal. Allowing quantity/type/price edits here would re-inflate the
    // available quantity and enable overselling, so those fields are frozen
    // until the deal is settled or cancelled.
    if (
      listing.status === 'NEGOTIATING' &&
      (input.type !== undefined ||
        input.quantity !== undefined ||
        input.unit !== undefined ||
        input.unitPrice !== undefined ||
        input.categoryId !== undefined ||
        input.materialId !== undefined)
    )
      throw new BadRequestException('LISTING_UNDER_NEGOTIATION');
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
          ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
          ...(input.longitude !== undefined
            ? { longitude: input.longitude }
            : {}),
          ...(listing.status === 'PUBLISHED'
            ? { status: 'PENDING_REVIEW', publishedAt: null }
            : {}),
        },
      });
      if (changed.count !== 1)
        throw new ConflictException('LISTING_STATE_CHANGED');
      if (attributes)
        await replaceListingAttributes(transaction, id, attributes);
      else if (categoryChanged)
        // Attributes belong to a category; stale ones are dropped on change.
        await transaction.listingAttribute.deleteMany({
          where: { listingId: id },
        });
      if (listing.status === 'PUBLISHED') {
        await transaction.moderationCase.create({ data: { listingId: id } });
        await transaction.listingStatusHistory.create({
          data: {
            listingId: id,
            fromStatus: 'PUBLISHED',
            toStatus: 'PENDING_REVIEW',
            actorUserId: userId,
            reason: 'LISTING_EDITED',
          },
        });
      }
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
      await transaction.listingStatusHistory.create({
        data: {
          listingId: id,
          fromStatus: listing.status,
          toStatus: 'PENDING_REVIEW',
          actorUserId: userId,
          reason: 'LISTING_SUBMITTED',
        },
      });
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
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.listing.update({
        where: { id },
        data: { status: 'PAUSED' },
        select: listingSelect,
      });
      await transaction.listingStatusHistory.create({
        data: {
          listingId: id,
          fromStatus: listing.status,
          toStatus: 'PAUSED',
          actorUserId: userId,
          reason: 'LISTING_PAUSED',
        },
      });
      return updated;
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
    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.listing.update({
        where: { id },
        data: { status: 'CLOSED' },
        select: listingSelect,
      });
      await transaction.listingStatusHistory.create({
        data: {
          listingId: id,
          fromStatus: listing.status,
          toStatus: 'CLOSED',
          actorUserId: userId,
          reason: 'LISTING_CLOSED',
        },
      });
      return updated;
    });
  }

  private async returnToReview(
    transaction: Prisma.TransactionClient,
    id: string,
    userId: string,
    reason: string,
  ) {
    const changed = await transaction.listing.updateMany({
      where: { id, status: 'PUBLISHED' },
      data: { status: 'PENDING_REVIEW', publishedAt: null },
    });
    if (changed.count !== 1)
      throw new ConflictException('LISTING_STATE_CHANGED');
    await transaction.moderationCase.create({ data: { listingId: id } });
    await transaction.listingStatusHistory.create({
      data: {
        listingId: id,
        fromStatus: 'PUBLISHED',
        toStatus: 'PENDING_REVIEW',
        actorUserId: userId,
        reason,
      },
    });
  }
  private parseOptionalDate(value?: string) {
    if (!value) return undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
      throw new BadRequestException('INVALID_DOCUMENT_VALIDITY');
    const date = new Date(`${value}T00:00:00.000Z`);
    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== value
    )
      throw new BadRequestException('INVALID_DOCUMENT_VALIDITY');
    return date;
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
  private async validateAttributes(
    categoryId: string,
    values: AttributeValueInput[],
  ) {
    const definitions = await this.prisma.materialAttribute.findMany({
      where: { categoryId },
      select: { id: true, type: true, options: true },
    });
    return normalizeAttributes(definitions, values);
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
