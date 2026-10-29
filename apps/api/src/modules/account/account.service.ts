import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../../infrastructure/prisma.service';
import { AuthService } from '../auth/auth.service';
import { decryptField, encryptField } from '../../common/field-encryption';
import { generateTotpSecret, otpauthUrl, verifyTotp } from '../../common/totp';
import { PRIVACY_VERSION, TERMS_VERSION } from '../../common/legal-versions';

const RECOVERY_CODE_COUNT = 8;
export const DELETE_CONFIRMATION = 'EXCLUIR';

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  async profile(userId: string): Promise<unknown> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        platformRole: true,
        emailVerifiedAt: true,
        mfaEnabledAt: true,
        mfaRecoveryCodes: true,
        createdAt: true,
        consents: {
          orderBy: { acceptedAt: 'desc' },
          select: { id: true, type: true, version: true, acceptedAt: true },
        },
      },
    });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    const { mfaRecoveryCodes, ...rest } = user;
    return {
      ...rest,
      mfaRecoveryCodesRemaining: Array.isArray(mfaRecoveryCodes)
        ? mfaRecoveryCodes.length
        : 0,
      currentLegalVersions: { terms: TERMS_VERSION, privacy: PRIVACY_VERSION },
    };
  }

  async updateProfile(userId: string, input: { name?: unknown }) {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (name.length < 2 || name.length > 150)
      throw new BadRequestException('INVALID_NAME');
    await this.prisma.user.update({ where: { id: userId }, data: { name } });
    return this.profile(userId);
  }

  async acceptCurrentTerms(userId: string, ipAddress?: string) {
    await this.prisma.userConsent.createMany({
      data: [
        { userId, type: 'TERMS', version: TERMS_VERSION, ipAddress },
        { userId, type: 'PRIVACY', version: PRIVACY_VERSION, ipAddress },
      ],
    });
    return this.profile(userId);
  }

  async changePassword(
    userId: string,
    currentSessionToken: string | null,
    input: { currentPassword?: unknown; newPassword?: unknown },
  ) {
    const current =
      typeof input.currentPassword === 'string' ? input.currentPassword : '';
    const next = typeof input.newPassword === 'string' ? input.newPassword : '';
    if (next.length < 8 || next.length > 128)
      throw new BadRequestException('INVALID_PASSWORD');
    await this.assertPassword(userId, current);
    const passwordHash = await this.auth.hashPassword(next);
    const keepHash = currentSessionToken
      ? this.auth.hashToken(currentSessionToken)
      : null;
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      // Every other device must sign in again with the new password.
      this.prisma.session.deleteMany({
        where: {
          userId,
          ...(keepHash ? { tokenHash: { not: keepHash } } : {}),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'PASSWORD_CHANGED',
          resourceType: 'USER',
          resourceId: userId,
        },
      }),
    ]);
    return { changed: true };
  }

  async sessions(userId: string, currentSessionToken: string | null) {
    const currentHash = currentSessionToken
      ? this.auth.hashToken(currentSessionToken)
      : null;
    const sessions = await this.prisma.session.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        tokenHash: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        expiresAt: true,
      },
    });
    return sessions.map(({ tokenHash, ipAddress, ...session }) => ({
      ...session,
      // Only a truncated address is shown back to the user.
      ipAddress: ipAddress ? this.truncateIp(ipAddress) : null,
      current: tokenHash === currentHash,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    const result = await this.prisma.session.deleteMany({
      where: { id: sessionId, userId },
    });
    if (result.count === 0) throw new NotFoundException('SESSION_NOT_FOUND');
    return { revoked: true };
  }

  async revokeOtherSessions(
    userId: string,
    currentSessionToken: string | null,
  ) {
    const keepHash = currentSessionToken
      ? this.auth.hashToken(currentSessionToken)
      : null;
    const result = await this.prisma.session.deleteMany({
      where: { userId, ...(keepHash ? { tokenHash: { not: keepHash } } : {}) },
    });
    return { revoked: result.count };
  }

  async startMfaSetup(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, mfaEnabledAt: true },
    });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    if (user.mfaEnabledAt) throw new ConflictException('MFA_ALREADY_ENABLED');
    const secret = generateTotpSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecretEncrypted: encryptField(secret) },
    });
    return {
      secret,
      otpauthUrl: otpauthUrl(secret, user.email, 'LOOP AMBIENTAL'),
    };
  }

  async enableMfa(userId: string, code: unknown) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabledAt: true, mfaSecretEncrypted: true },
    });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    if (user.mfaEnabledAt) throw new ConflictException('MFA_ALREADY_ENABLED');
    if (!user.mfaSecretEncrypted)
      throw new BadRequestException('MFA_SETUP_REQUIRED');
    const secret = decryptField(user.mfaSecretEncrypted);
    if (!secret || typeof code !== 'string' || !verifyTotp(secret, code))
      throw new BadRequestException('INVALID_MFA_CODE');
    const recoveryCodes = Array.from({ length: RECOVERY_CODE_COUNT }, () =>
      randomBytes(5).toString('hex').toUpperCase(),
    );
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabledAt: new Date(),
          mfaRecoveryCodes: recoveryCodes.map((value) =>
            this.auth.hashToken(value),
          ),
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'MFA_ENABLED',
          resourceType: 'USER',
          resourceId: userId,
        },
      }),
    ]);
    // Shown exactly once; only hashes are stored.
    return { enabled: true, recoveryCodes };
  }

  async disableMfa(
    userId: string,
    input: { password?: unknown; code?: unknown },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabledAt: true, mfaSecretEncrypted: true },
    });
    if (!user?.mfaEnabledAt || !user.mfaSecretEncrypted)
      throw new BadRequestException('MFA_NOT_ENABLED');
    await this.assertPassword(
      userId,
      typeof input.password === 'string' ? input.password : '',
    );
    const secret = decryptField(user.mfaSecretEncrypted);
    if (
      !secret ||
      typeof input.code !== 'string' ||
      !verifyTotp(secret, input.code)
    )
      throw new BadRequestException('INVALID_MFA_CODE');
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          mfaEnabledAt: null,
          mfaSecretEncrypted: null,
          mfaRecoveryCodes: [],
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'MFA_DISABLED',
          resourceType: 'USER',
          resourceId: userId,
        },
      }),
    ]);
    return { enabled: false };
  }

  /**
   * LGPD data portability: everything the platform holds about the user, in a
   * machine-readable document. Secrets and other people's data are excluded.
   */
  async exportData(userId: string): Promise<unknown> {
    const [
      user,
      memberships,
      listings,
      proposals,
      messages,
      notifications,
      favorites,
      savedSearches,
      reviews,
      sessions,
      requests,
    ] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          platformRole: true,
          emailVerifiedAt: true,
          mfaEnabledAt: true,
          createdAt: true,
          updatedAt: true,
          consents: {
            select: { type: true, version: true, acceptedAt: true },
          },
        },
      }),
      this.prisma.companyMember.findMany({
        where: { userId },
        select: {
          role: true,
          joinedAt: true,
          company: {
            select: { id: true, legalName: true, tradeName: true, city: true },
          },
        },
      }),
      this.prisma.listing.findMany({
        where: { createdByUserId: userId },
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.proposal.findMany({
        where: { createdByUserId: userId },
        select: {
          id: true,
          listingId: true,
          quantity: true,
          unitPrice: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.message.findMany({
        where: { senderUserId: userId, deletedAt: null },
        select: { id: true, conversationId: true, body: true, createdAt: true },
      }),
      this.prisma.notification.findMany({
        where: { userId },
        select: { type: true, title: true, readAt: true, createdAt: true },
      }),
      this.prisma.favorite.findMany({
        where: { userId },
        select: { listingId: true, createdAt: true },
      }),
      this.prisma.savedSearch.findMany({
        where: { userId },
        select: { name: true, filters: true, frequency: true, createdAt: true },
      }),
      this.prisma.review.findMany({
        where: { authorUserId: userId },
        select: { dealId: true, rating: true, comment: true, createdAt: true },
      }),
      this.prisma.session.findMany({
        where: { userId },
        select: { userAgent: true, createdAt: true, expiresAt: true },
      }),
      this.prisma.dataRequest.findMany({
        where: { userId },
        select: { type: true, status: true, createdAt: true },
      }),
    ]);
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    await this.prisma.dataRequest.create({
      data: {
        userId,
        type: 'EXPORT',
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
    return {
      generatedAt: new Date().toISOString(),
      legalBasis:
        'Exportação a pedido do titular (art. 18, V, da LGPD). Ambiente de demonstração.',
      user,
      memberships,
      listings,
      proposals,
      messages,
      notifications,
      favorites,
      savedSearches,
      reviews,
      sessions,
      dataRequests: requests,
    };
  }

  /**
   * Anonymizes the account. Commercial history (proposals, deals, messages,
   * audit logs) is kept for legal retention but no longer points to a person.
   */
  async deleteAccount(
    userId: string,
    input: { password?: unknown; confirmation?: unknown },
  ) {
    if (input.confirmation !== DELETE_CONFIRMATION)
      throw new BadRequestException('DELETE_CONFIRMATION_REQUIRED');
    await this.assertPassword(
      userId,
      typeof input.password === 'string' ? input.password : '',
    );
    const ownerships = await this.prisma.companyMember.findMany({
      where: { userId, role: 'OWNER' },
      select: { companyId: true },
    });
    for (const { companyId } of ownerships) {
      const [otherOwners, otherMembers] = await Promise.all([
        this.prisma.companyMember.count({
          where: { companyId, role: 'OWNER', userId: { not: userId } },
        }),
        this.prisma.companyMember.count({
          where: { companyId, userId: { not: userId } },
        }),
      ]);
      // A company cannot be left without an owner while it still has a team.
      if (otherMembers > 0 && otherOwners === 0) {
        await this.prisma.dataRequest.create({
          data: {
            userId,
            type: 'DELETION',
            status: 'REJECTED',
            notes:
              'Transfira a propriedade da empresa antes de excluir a conta.',
          },
        });
        throw new ConflictException('TRANSFER_COMPANY_OWNERSHIP_FIRST');
      }
    }
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.session.deleteMany({ where: { userId } }),
      this.prisma.authToken.deleteMany({ where: { userId } }),
      this.prisma.favorite.deleteMany({ where: { userId } }),
      this.prisma.savedSearch.deleteMany({ where: { userId } }),
      this.prisma.notification.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          name: 'Usuário removido',
          email: `removido+${userId}@anonimizado.invalid`,
          passwordHash: null,
          status: 'DELETED',
          deletedAt: now,
          mfaEnabledAt: null,
          mfaSecretEncrypted: null,
          mfaRecoveryCodes: [],
        },
      }),
      this.prisma.dataRequest.create({
        data: {
          userId,
          type: 'DELETION',
          status: 'COMPLETED',
          completedAt: now,
          notes:
            'Conta anonimizada; histórico comercial mantido por obrigação legal.',
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'ACCOUNT_ANONYMIZED',
          resourceType: 'USER',
          resourceId: userId,
        },
      }),
    ]);
    return { deleted: true };
  }

  listDataRequests(): Promise<unknown> {
    return this.prisma.dataRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        type: true,
        status: true,
        notes: true,
        createdAt: true,
        completedAt: true,
        user: { select: { id: true, name: true } },
      },
    });
  }

  private async assertPassword(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (
      !user?.passwordHash ||
      !password ||
      !(await this.auth.verifyPassword(password, user.passwordHash))
    )
      throw new BadRequestException('INVALID_PASSWORD');
  }

  private truncateIp(ip: string) {
    if (ip.includes('.')) return ip.split('.').slice(0, 3).join('.') + '.x';
    return ip.split(':').slice(0, 3).join(':') + ':…';
  }
}
