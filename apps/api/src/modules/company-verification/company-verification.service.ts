import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import { ListingMediaStorageService } from '../../infrastructure/listing-media-storage.service';
import { OutboxService } from '../../infrastructure/outbox.service';
import { NotificationsService } from '../notifications/notifications.service';

export type CompanyDocumentType =
  | 'CNPJ_CARD'
  | 'SOCIAL_CONTRACT'
  | 'ADDRESS_PROOF'
  | 'OPERATING_LICENSE'
  | 'ENVIRONMENTAL_LICENSE'
  | 'OTHER';

const DOCUMENT_TYPES: CompanyDocumentType[] = [
  'CNPJ_CARD',
  'SOCIAL_CONTRACT',
  'ADDRESS_PROOF',
  'OPERATING_LICENSE',
  'ENVIRONMENTAL_LICENSE',
  'OTHER',
];

const MAX_DOCUMENTS = 10;

const documentSelect = {
  id: true,
  type: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  status: true,
  reviewNotes: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  uploadedBy: { select: { id: true, name: true } },
} as const;

const verificationSelect = {
  id: true,
  status: true,
  notes: true,
  reviewNotes: true,
  reviewedAt: true,
  createdAt: true,
  requestedBy: { select: { id: true, name: true } },
  reviewedBy: { select: { id: true, name: true } },
} as const;

@Injectable()
export class CompanyVerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ListingMediaStorageService,
    private readonly outbox: OutboxService,
    private readonly notifications: NotificationsService,
  ) {}

  isValidDocumentType(value: string): value is CompanyDocumentType {
    return DOCUMENT_TYPES.includes(value as CompanyDocumentType);
  }

  async addDocument(
    userId: string,
    companyId: string,
    type: CompanyDocumentType,
    file: Express.Multer.File | undefined,
  ) {
    await this.assertCanManage(userId, companyId);
    const company = await this.getCompany(companyId);
    if (company.verification === 'VERIFIED')
      throw new BadRequestException('COMPANY_ALREADY_VERIFIED');
    if (!file) throw new BadRequestException('DOCUMENT_REQUIRED');
    const existing = await this.prisma.companyDocument.count({
      where: { companyId },
    });
    if (existing >= MAX_DOCUMENTS)
      throw new BadRequestException('DOCUMENT_LIMIT_EXCEEDED');

    const upload = await this.storage.uploadDocument(file);
    try {
      return await this.prisma.companyDocument.create({
        data: {
          companyId,
          uploadedByUserId: userId,
          type,
          ...upload,
        },
        select: documentSelect,
      });
    } catch (error) {
      await this.storage.remove(upload.storageKey);
      throw error;
    }
  }

  async listDocuments(userId: string, companyId: string) {
    await this.assertMember(userId, companyId);
    return this.prisma.companyDocument.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: documentSelect,
    });
  }

  async readDocument(
    userId: string,
    platformRole: string,
    companyId: string,
    documentId: string,
  ) {
    const isReviewer = platformRole === 'ADMIN' || platformRole === 'MODERATOR';
    if (!isReviewer) await this.assertMember(userId, companyId);
    const document = await this.prisma.companyDocument.findFirst({
      where: { id: documentId, companyId },
      select: { storageKey: true, mimeType: true, fileName: true },
    });
    if (!document) throw new NotFoundException('DOCUMENT_NOT_FOUND');
    return {
      buffer: await this.storage.read(document.storageKey),
      mimeType: document.mimeType,
      fileName: document.fileName,
    };
  }

  async removeDocument(userId: string, companyId: string, documentId: string) {
    await this.assertCanManage(userId, companyId);
    const document = await this.prisma.companyDocument.findFirst({
      where: { id: documentId, companyId },
    });
    if (!document) throw new NotFoundException('DOCUMENT_NOT_FOUND');
    if (document.status === 'APPROVED')
      throw new BadRequestException('DOCUMENT_ALREADY_APPROVED');
    await this.prisma.companyDocument.delete({ where: { id: document.id } });
    await this.storage.remove(document.storageKey);
    return { id: document.id, removed: true };
  }

  async requestVerification(userId: string, companyId: string, notes?: string) {
    await this.assertCanManage(userId, companyId);
    const company = await this.getCompany(companyId);
    if (company.verification === 'VERIFIED')
      throw new BadRequestException('COMPANY_ALREADY_VERIFIED');
    const documentCount = await this.prisma.companyDocument.count({
      where: { companyId },
    });
    if (documentCount === 0)
      throw new BadRequestException('DOCUMENTS_REQUIRED');
    const open = await this.prisma.companyVerification.findFirst({
      where: { companyId, status: 'PENDING' },
      select: verificationSelect,
    });
    if (open) return open;

    return this.prisma.$transaction(async (transaction) => {
      const created = await transaction.companyVerification.create({
        data: {
          companyId,
          requestedByUserId: userId,
          notes: notes?.trim() || null,
        },
        select: verificationSelect,
      });
      await transaction.company.update({
        where: { id: companyId },
        data: { verification: 'PENDING' },
      });
      await transaction.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'COMPANY_VERIFICATION_REQUESTED',
          resourceType: 'COMPANY',
          resourceId: companyId,
          metadata: { verificationId: created.id },
        },
      });
      return created;
    });
  }

  async listVerifications(userId: string, companyId: string) {
    await this.assertMember(userId, companyId);
    return this.prisma.companyVerification.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      select: verificationSelect,
    });
  }

  async listAdmin() {
    return this.prisma.companyVerification.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      select: {
        ...verificationSelect,
        company: {
          select: {
            id: true,
            legalName: true,
            tradeName: true,
            city: true,
            state: true,
            verification: true,
            contactName: true,
            contactEmail: true,
            documents: {
              orderBy: { createdAt: 'asc' },
              select: documentSelect,
            },
          },
        },
      },
    });
  }

  async approve(actorId: string, verificationId: string) {
    return this.decide(actorId, verificationId, 'APPROVED');
  }

  async reject(actorId: string, verificationId: string, reason: string) {
    if (reason.trim().length < 3)
      throw new BadRequestException('MODERATION_REASON_REQUIRED');
    return this.decide(actorId, verificationId, 'REJECTED', reason.trim());
  }

  private async decide(
    actorId: string,
    verificationId: string,
    decision: 'APPROVED' | 'REJECTED',
    reason?: string,
  ) {
    const verification = await this.prisma.companyVerification.findFirst({
      where: { id: verificationId, status: 'PENDING' },
    });
    if (!verification) throw new NotFoundException('VERIFICATION_NOT_FOUND');

    const result = await this.prisma.$transaction(async (transaction) => {
      const claimed = await transaction.companyVerification.updateMany({
        where: { id: verificationId, status: 'PENDING' },
        data: {
          status: decision,
          reviewNotes: reason ?? null,
          reviewedByUserId: actorId,
          reviewedAt: new Date(),
        },
      });
      if (claimed.count !== 1)
        throw new ConflictException('VERIFICATION_ALREADY_DECIDED');

      await transaction.company.update({
        where: { id: verification.companyId },
        data: {
          verification: decision === 'APPROVED' ? 'VERIFIED' : 'REJECTED',
        },
      });

      await transaction.companyDocument.updateMany({
        where: { companyId: verification.companyId, status: 'PENDING' },
        data: {
          status: decision === 'APPROVED' ? 'APPROVED' : 'REJECTED',
          reviewNotes: reason ?? null,
          reviewedByUserId: actorId,
          reviewedAt: new Date(),
        },
      });

      await transaction.auditLog.create({
        data: {
          actorUserId: actorId,
          action:
            decision === 'APPROVED'
              ? 'COMPANY_VERIFIED'
              : 'COMPANY_VERIFICATION_REJECTED',
          resourceType: 'COMPANY',
          resourceId: verification.companyId,
          metadata: { verificationId, reason: reason ?? null },
        },
      });

      await this.outbox.enqueueWithin(transaction, {
        type:
          decision === 'APPROVED'
            ? 'company.verification.approved'
            : 'company.verification.rejected',
        aggregateType: 'COMPANY',
        aggregateId: verification.companyId,
        payload: {
          verificationId,
          companyId: verification.companyId,
          reason: reason ?? null,
        },
      });

      return transaction.companyVerification.findUniqueOrThrow({
        where: { id: verificationId },
        select: {
          ...verificationSelect,
          company: {
            select: { id: true, legalName: true, verification: true },
          },
        },
      });
    });

    await this.notifyCompany(
      verification.companyId,
      decision === 'APPROVED'
        ? {
            type: 'COMPANY_VERIFIED',
            title: 'Empresa verificada',
            body: 'A verificação da sua empresa foi aprovada.',
          }
        : {
            type: 'COMPANY_VERIFICATION_REJECTED',
            title: 'Verificação recusada',
            body: reason
              ? `A verificação foi recusada: ${reason}`
              : 'A verificação da sua empresa foi recusada.',
          },
      { verificationId },
    );

    return result;
  }

  private async notifyCompany(
    companyId: string,
    input: {
      type: 'COMPANY_VERIFIED' | 'COMPANY_VERIFICATION_REJECTED';
      title: string;
      body: string;
    },
    payload: Record<string, string>,
  ) {
    const members = await this.prisma.companyMember.findMany({
      where: { companyId, role: { in: ['OWNER', 'ADMIN'] } },
      select: { userId: true },
    });
    await Promise.all(
      members.map((member) =>
        this.notifications.create(member.userId, { ...input, payload }),
      ),
    );
  }

  private async getCompany(companyId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { id: true, verification: true },
    });
    if (!company) throw new NotFoundException('COMPANY_NOT_FOUND');
    return company;
  }

  private async assertMember(userId: string, companyId: string) {
    const membership = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
    if (!membership) throw new ForbiddenException('COMPANY_ACCESS_DENIED');
  }

  private async assertCanManage(userId: string, companyId: string) {
    const membership = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
    if (!membership) throw new ForbiddenException('COMPANY_ACCESS_DENIED');
    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN')
      throw new ForbiddenException('COMPANY_MANAGEMENT_REQUIRED');
  }
}
