import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';

@Injectable()
export class ModerationService {
  constructor(private readonly prisma: PrismaService) {}

  async listCases() {
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
            company: { select: { legalName: true, tradeName: true } },
            category: { select: { name: true } },
          },
        },
      },
    });
  }
  async approve(caseId: string, actorId: string) {
    const moderationCase = await this.getCase(caseId);
    return this.prisma.$transaction(async (transaction) => {
      const listing = await transaction.listing.update({
        where: { id: moderationCase.listingId },
        data: { status: 'PUBLISHED', publishedAt: new Date() },
        select: { id: true, title: true, status: true, publishedAt: true },
      });
      await transaction.moderationCase.update({
        where: { id: caseId },
        data: { status: 'APPROVED', reviewedAt: new Date() },
      });
      await transaction.moderationAction.create({
        data: { caseId, actorId, type: 'APPROVE' },
      });
      return listing;
    });
  }
  async reject(caseId: string, actorId: string, reason: string) {
    if (reason.trim().length < 3)
      throw new BadRequestException('MODERATION_REASON_REQUIRED');
    const moderationCase = await this.getCase(caseId);
    return this.prisma.$transaction(async (transaction) => {
      const listing = await transaction.listing.update({
        where: { id: moderationCase.listingId },
        data: { status: 'REJECTED' },
        select: { id: true, title: true, status: true },
      });
      await transaction.moderationCase.update({
        where: { id: caseId },
        data: {
          status: 'REJECTED',
          reason: reason.trim(),
          reviewedAt: new Date(),
        },
      });
      await transaction.moderationAction.create({
        data: { caseId, actorId, type: 'REJECT', reason: reason.trim() },
      });
      return listing;
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
