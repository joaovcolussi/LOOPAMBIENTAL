import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../infrastructure/prisma.service';
import { EmailService } from '../auth/email.service';

type InvitableRole = 'ADMIN' | 'MEMBER';
type CompanyMemberRoleValue = 'OWNER' | 'ADMIN' | 'MEMBER';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const memberSelect = {
  companyId: true,
  userId: true,
  role: true,
  joinedAt: true,
  user: {
    select: { id: true, name: true, email: true, status: true },
  },
} as const;

const invitationSelect = {
  id: true,
  email: true,
  role: true,
  status: true,
  expiresAt: true,
  createdAt: true,
  invitedBy: { select: { id: true, name: true } },
} as const;

@Injectable()
export class CompanyMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async listMembers(userId: string, companyId: string) {
    await this.assertMember(userId, companyId);
    return this.prisma.companyMember.findMany({
      where: { companyId },
      orderBy: { joinedAt: 'asc' },
      select: memberSelect,
    });
  }

  async listInvitations(userId: string, companyId: string) {
    await this.assertCanManage(userId, companyId);
    return this.prisma.companyInvitation.findMany({
      where: { companyId, status: 'PENDING', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: invitationSelect,
    });
  }

  async invite(userId: string, companyId: string, email: string, role: string) {
    await this.assertCanManage(userId, companyId);
    const company = await this.getCompany(companyId);
    const normalized = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalized))
      throw new BadRequestException('INVALID_EMAIL');
    if (role !== 'ADMIN' && role !== 'MEMBER')
      throw new BadRequestException('INVALID_ROLE');

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true },
    });
    if (existingUser) {
      const membership = await this.prisma.companyMember.findUnique({
        where: {
          companyId_userId: { companyId, userId: existingUser.id },
        },
      });
      if (membership) throw new ConflictException('MEMBER_ALREADY_EXISTS');
    }
    const pending = await this.prisma.companyInvitation.findFirst({
      where: {
        companyId,
        email: normalized,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });
    if (pending) throw new ConflictException('INVITATION_ALREADY_PENDING');

    const token = randomBytes(32).toString('base64url');
    const invitation = await this.prisma.companyInvitation.create({
      data: {
        companyId,
        email: normalized,
        role: role as InvitableRole,
        invitedByUserId: userId,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
      },
      select: invitationSelect,
    });

    const inviter = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    try {
      await this.emailService.sendCompanyInvitation(
        normalized,
        company.tradeName || company.legalName,
        inviter?.name ?? 'Um administrador',
        token,
      );
    } catch {
      // Invitation is valid even if the e-mail provider is unavailable.
    }
    return invitation;
  }

  async revokeInvitation(
    userId: string,
    companyId: string,
    invitationId: string,
  ) {
    await this.assertCanManage(userId, companyId);
    const result = await this.prisma.companyInvitation.updateMany({
      where: { id: invitationId, companyId, status: 'PENDING' },
      data: { status: 'REVOKED' },
    });
    if (result.count === 0) throw new NotFoundException('INVITATION_NOT_FOUND');
    return { id: invitationId, revoked: true };
  }

  async changeRole(
    actorId: string,
    companyId: string,
    targetUserId: string,
    role: string,
  ) {
    await this.assertOwner(actorId, companyId);
    if (role !== 'ADMIN' && role !== 'MEMBER')
      throw new BadRequestException('INVALID_ROLE');
    const target = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('MEMBER_NOT_FOUND');
    if (target.role === 'OWNER')
      throw new BadRequestException('OWNER_ROLE_IMMUTABLE');
    return this.prisma.companyMember.update({
      where: { companyId_userId: { companyId, userId: targetUserId } },
      data: { role },
      select: memberSelect,
    });
  }

  async removeMember(actorId: string, companyId: string, targetUserId: string) {
    const actorRole = await this.assertCanManage(actorId, companyId);
    if (actorId === targetUserId)
      throw new BadRequestException('CANNOT_REMOVE_SELF');
    const target = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId: targetUserId } },
    });
    if (!target) throw new NotFoundException('MEMBER_NOT_FOUND');
    if (target.role === 'OWNER')
      throw new ForbiddenException('OWNER_CANNOT_BE_REMOVED');
    if (actorRole === 'ADMIN' && target.role === 'ADMIN')
      throw new ForbiddenException('ADMIN_CANNOT_REMOVE_ADMIN');
    await this.prisma.companyMember.delete({
      where: { companyId_userId: { companyId, userId: targetUserId } },
    });
    return { userId: targetUserId, removed: true };
  }

  async getInvitation(userId: string, token: string) {
    const invitation = await this.prisma.companyInvitation.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: {
        company: {
          select: {
            id: true,
            legalName: true,
            tradeName: true,
            deletedAt: true,
          },
        },
      },
    });
    if (!invitation) throw new NotFoundException('INVITATION_NOT_FOUND');
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return {
      id: invitation.id,
      status: invitation.status,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      expired: invitation.expiresAt <= new Date(),
      emailMasked: this.maskEmail(invitation.email),
      emailMatches: invitation.email === user?.email.toLowerCase(),
      company: {
        id: invitation.company.id,
        name: invitation.company.tradeName || invitation.company.legalName,
      },
    };
  }

  async acceptInvitation(userId: string, token: string) {
    const invitation = await this.prisma.companyInvitation.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { company: { select: { id: true, deletedAt: true } } },
    });
    if (
      !invitation ||
      invitation.status !== 'PENDING' ||
      invitation.expiresAt <= new Date()
    )
      throw new UnauthorizedException('INVITATION_INVALID');
    if (invitation.company.deletedAt)
      throw new NotFoundException('COMPANY_NOT_FOUND');
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user || invitation.email !== user.email.toLowerCase())
      throw new ForbiddenException('INVITATION_EMAIL_MISMATCH');

    await this.prisma.$transaction([
      this.prisma.companyMember.upsert({
        where: {
          companyId_userId: { companyId: invitation.companyId, userId },
        },
        update: {},
        create: {
          companyId: invitation.companyId,
          userId,
          role: invitation.role,
        },
      }),
      this.prisma.companyInvitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      }),
    ]);
    return { companyId: invitation.companyId, role: invitation.role };
  }

  private async getCompany(companyId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { id: true, legalName: true, tradeName: true },
    });
    if (!company) throw new NotFoundException('COMPANY_NOT_FOUND');
    return company;
  }

  private async assertMember(userId: string, companyId: string) {
    const membership = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
    if (!membership) throw new ForbiddenException('COMPANY_ACCESS_DENIED');
    return membership;
  }

  private async assertCanManage(userId: string, companyId: string) {
    const membership = await this.assertMember(userId, companyId);
    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN')
      throw new ForbiddenException('COMPANY_MANAGEMENT_REQUIRED');
    return membership.role as CompanyMemberRoleValue;
  }

  private async assertOwner(userId: string, companyId: string) {
    const membership = await this.assertMember(userId, companyId);
    if (membership.role !== 'OWNER')
      throw new ForbiddenException('COMPANY_OWNER_REQUIRED');
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private maskEmail(email: string) {
    const [local, domain] = email.split('@');
    if (!domain) return '***';
    const visible = local.slice(0, 1);
    return `${visible}***@${domain}`;
  }
}
