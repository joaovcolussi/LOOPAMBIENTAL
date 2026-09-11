import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async listCases(): Promise<unknown> {
    return this.prisma.moderationCase.findMany({
      where: { status: { in: ['OPEN', 'IN_REVIEW'] } },
      orderBy: { createdAt: 'asc' },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            description: true,
            quantity: true,
            unit: true,
            unitPrice: true,
            currency: true,
            city: true,
            state: true,
            riskClassification: true,
            requiresDocuments: true,
            ownTransport: true,
            company: { select: { legalName: true, tradeName: true } },
            category: { select: { name: true } },
            media: {
              where: { status: 'READY' },
              orderBy: { sortOrder: 'asc' },
              select: { id: true, altText: true, sortOrder: true },
            },
          },
        },
      },
    });
  }
  async approve(caseId: string, actorId: string) {
    const moderationCase = await this.getCase(caseId);
    return this.prisma.$transaction(async (transaction) => {
      const claimed = await transaction.moderationCase.updateMany({
        where: { id: caseId, status: { in: ['OPEN', 'IN_REVIEW'] } },
        data: { status: 'APPROVED', reviewedAt: new Date() },
      });
      if (claimed.count !== 1)
        throw new ConflictException('MODERATION_ALREADY_DECIDED');
      const listingChanged = await transaction.listing.updateMany({
        where: {
          id: moderationCase.listingId,
          status: 'PENDING_REVIEW',
          deletedAt: null,
        },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
      });
      if (listingChanged.count !== 1)
        throw new ConflictException('LISTING_STATE_CHANGED');
      await transaction.moderationAction.create({
        data: { caseId, actorId, type: 'APPROVE' },
      });
      return transaction.listing.findUniqueOrThrow({
        where: { id: moderationCase.listingId },
        select: { id: true, title: true, status: true, publishedAt: true },
      });
    });
  }
  async reject(caseId: string, actorId: string, reason: string) {
    if (reason.trim().length < 3)
      throw new BadRequestException('MODERATION_REASON_REQUIRED');
    const moderationCase = await this.getCase(caseId);
    return this.prisma.$transaction(async (transaction) => {
      const claimed = await transaction.moderationCase.updateMany({
        where: { id: caseId, status: { in: ['OPEN', 'IN_REVIEW'] } },
        data: {
          status: 'REJECTED',
          reason: reason.trim(),
          reviewedAt: new Date(),
        },
      });
      if (claimed.count !== 1)
        throw new ConflictException('MODERATION_ALREADY_DECIDED');
      const listingChanged = await transaction.listing.updateMany({
        where: {
          id: moderationCase.listingId,
          status: 'PENDING_REVIEW',
          deletedAt: null,
        },
        data: { status: 'REJECTED' },
      });
      if (listingChanged.count !== 1)
        throw new ConflictException('LISTING_STATE_CHANGED');
      await transaction.moderationAction.create({
        data: { caseId, actorId, type: 'REJECT', reason: reason.trim() },
      });
      return transaction.listing.findUniqueOrThrow({
        where: { id: moderationCase.listingId },
        select: { id: true, title: true, status: true },
      });
    });
  }
  private async getCase(id: string) {
    const moderationCase = await this.prisma.moderationCase.findFirst({
      where: { id, status: { in: ['OPEN', 'IN_REVIEW'] } },
    });
    if (!moderationCase)
      throw new NotFoundException('MODERATION_CASE_NOT_FOUND');
    return moderationCase;
  }
}
