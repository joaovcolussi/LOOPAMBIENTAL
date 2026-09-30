import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';

export type ReportTargetTypeValue = 'LISTING' | 'COMPANY' | 'USER' | 'MESSAGE';

const REPORT_TARGETS: ReportTargetTypeValue[] = [
  'LISTING',
  'COMPANY',
  'USER',
  'MESSAGE',
];

const REPORT_REASONS = [
  'COUNTERFEIT',
  'PRODUCT_QUALITY',
  'MISLEADING',
  'CONTACT_ABUSE',
  'SPAM',
  'ILLEGAL',
  'HAZARDOUS',
  'UNDOCUMENTED',
  'OTHER',
] as const;

type ReportReasonValue = (typeof REPORT_REASONS)[number];

const reportSelect = {
  id: true,
  targetType: true,
  reason: true,
  details: true,
  status: true,
  resolutionNotes: true,
  reviewedAt: true,
  createdAt: true,
  reporter: { select: { id: true, name: true, email: true } },
  reviewedBy: { select: { id: true, name: true } },
  listing: { select: { id: true, title: true, slug: true, status: true } },
  company: { select: { id: true, legalName: true, tradeName: true } },
  reportedUser: { select: { id: true, name: true, email: true } },
  message: {
    select: { id: true, body: true, conversationId: true, senderUserId: true },
  },
} as const;

export type ReportInput = {
  targetType: string;
  listingId?: string;
  companyId?: string;
  reportedUserId?: string;
  messageId?: string;
  reason: string;
  details?: string;
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: ReportInput) {
    if (!REPORT_TARGETS.includes(input.targetType as ReportTargetTypeValue))
      throw new BadRequestException('INVALID_REPORT_TARGET');
    if (!REPORT_REASONS.includes(input.reason as ReportReasonValue))
      throw new BadRequestException('INVALID_REPORT_REASON');

    const targets = [
      input.listingId,
      input.companyId,
      input.reportedUserId,
      input.messageId,
    ].filter(Boolean);
    if (targets.length !== 1)
      throw new BadRequestException('INVALID_REPORT_TARGET');

    if (input.targetType === 'LISTING' && !input.listingId)
      throw new BadRequestException('INVALID_REPORT_TARGET');
    if (input.targetType === 'COMPANY' && !input.companyId)
      throw new BadRequestException('INVALID_REPORT_TARGET');
    if (input.targetType === 'USER' && !input.reportedUserId)
      throw new BadRequestException('INVALID_REPORT_TARGET');
    if (input.targetType === 'MESSAGE' && !input.messageId)
      throw new BadRequestException('INVALID_REPORT_TARGET');

    if (input.listingId) {
      const listing = await this.prisma.listing.findFirst({
        where: { id: input.listingId, deletedAt: null },
        select: { id: true },
      });
      if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');
    }
    if (input.companyId) {
      const company = await this.prisma.company.findFirst({
        where: { id: input.companyId, deletedAt: null },
        select: { id: true },
      });
      if (!company) throw new NotFoundException('COMPANY_NOT_FOUND');
    }
    if (input.reportedUserId) {
      if (input.reportedUserId === userId)
        throw new BadRequestException('SELF_REPORT_NOT_ALLOWED');
      const user = await this.prisma.user.findFirst({
        where: { id: input.reportedUserId, deletedAt: null },
        select: { id: true },
      });
      if (!user) throw new NotFoundException('USER_NOT_FOUND');
    }
    if (input.messageId) {
      const message = await this.prisma.message.findFirst({
        where: { id: input.messageId, deletedAt: null },
        select: { id: true, senderUserId: true },
      });
      if (!message) throw new NotFoundException('MESSAGE_NOT_FOUND');
      if (message.senderUserId === userId)
        throw new BadRequestException('SELF_REPORT_NOT_ALLOWED');
    }

    return this.prisma.report.create({
      data: {
        reporterUserId: userId,
        targetType: input.targetType as ReportTargetTypeValue,
        reason: input.reason as ReportReasonValue,
        details: input.details?.trim() || null,
        listingId: input.listingId,
        companyId: input.companyId,
        reportedUserId: input.reportedUserId,
        messageId: input.messageId,
      },
      select: reportSelect,
    });
  }

  async listAdmin() {
    return this.prisma.report.findMany({
      where: { status: { in: ['OPEN', 'IN_REVIEW'] } },
      orderBy: { createdAt: 'asc' },
      take: 200,
      select: reportSelect,
    });
  }

  async resolve(actorId: string, id: string, status: string, notes?: string) {
    if (status !== 'RESOLVED' && status !== 'DISMISSED')
      throw new BadRequestException('INVALID_REPORT_STATUS');
    const result = await this.prisma.report.updateMany({
      where: { id, status: { in: ['OPEN', 'IN_REVIEW'] } },
      data: {
        status,
        resolutionNotes: notes?.trim() || null,
        reviewedByUserId: actorId,
        reviewedAt: new Date(),
      },
    });
    if (result.count === 0) throw new NotFoundException('REPORT_NOT_FOUND');
    return this.prisma.report.findUnique({
      where: { id },
      select: reportSelect,
    });
  }
}
