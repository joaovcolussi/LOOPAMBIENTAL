import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../infrastructure/prisma.service';

const MAX_ACTIVE_KEYS = 5;
const KEY_PREFIX = 'la_demo_';
// Avoid a write on every request: lastUsedAt is refreshed at most per minute.
const LAST_USED_RESOLUTION_MS = 60_000;

export type ApiKeyPrincipal = {
  keyId: string;
  companyId: string;
  userId: string;
};

const keySelect = {
  id: true,
  name: true,
  prefix: true,
  lastUsedAt: true,
  revokedAt: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true } },
} as const;

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, companyId: string): Promise<unknown> {
    return this.assertManager(userId, companyId).then(() =>
      this.prisma.apiKey.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        select: keySelect,
      }),
    );
  }

  async create(userId: string, companyId: string, name: unknown) {
    await this.assertManager(userId, companyId);
    const label = typeof name === 'string' ? name.trim() : '';
    if (label.length < 2 || label.length > 120)
      throw new BadRequestException('INVALID_API_KEY_NAME');
    const active = await this.prisma.apiKey.count({
      where: { companyId, revokedAt: null },
    });
    if (active >= MAX_ACTIVE_KEYS)
      throw new BadRequestException('API_KEY_LIMIT_REACHED');
    const secret = `${KEY_PREFIX}${randomBytes(24).toString('base64url')}`;
    const key = await this.prisma.apiKey.create({
      data: {
        companyId,
        createdByUserId: userId,
        name: label,
        prefix: secret.slice(0, 14),
        keyHash: this.hash(secret),
      },
      select: keySelect,
    });
    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'API_KEY_CREATED',
        resourceType: 'API_KEY',
        resourceId: key.id,
        metadata: { companyId, name: label },
      },
    });
    // The plain secret is returned exactly once.
    return { key, secret };
  }

  async revoke(userId: string, companyId: string, keyId: string) {
    await this.assertManager(userId, companyId);
    const result = await this.prisma.apiKey.updateMany({
      where: { id: keyId, companyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException('API_KEY_NOT_FOUND');
    await this.prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: 'API_KEY_REVOKED',
        resourceType: 'API_KEY',
        resourceId: keyId,
        metadata: { companyId },
      },
    });
    return { revoked: true };
  }

  async authenticate(secret: string): Promise<ApiKeyPrincipal | null> {
    if (!secret.startsWith(KEY_PREFIX) || secret.length > 200) return null;
    const key = await this.prisma.apiKey.findUnique({
      where: { keyHash: this.hash(secret) },
      select: {
        id: true,
        companyId: true,
        createdByUserId: true,
        revokedAt: true,
        lastUsedAt: true,
        company: { select: { status: true } },
      },
    });
    if (!key || key.revokedAt || key.company.status === 'BLOCKED') return null;
    // The key acts on behalf of its creator, who must still be a member.
    const membership = await this.prisma.companyMember.findUnique({
      where: {
        companyId_userId: {
          companyId: key.companyId,
          userId: key.createdByUserId,
        },
      },
      select: { role: true },
    });
    if (!membership) return null;
    if (
      !key.lastUsedAt ||
      Date.now() - key.lastUsedAt.getTime() > LAST_USED_RESOLUTION_MS
    )
      await this.prisma.apiKey.update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() },
      });
    return {
      keyId: key.id,
      companyId: key.companyId,
      userId: key.createdByUserId,
    };
  }

  private hash(secret: string) {
    return createHash('sha256').update(secret).digest('hex');
  }

  private async assertManager(userId: string, companyId: string) {
    const membership = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });
    if (!membership) throw new ForbiddenException('COMPANY_ACCESS_DENIED');
    if (membership.role !== 'OWNER' && membership.role !== 'ADMIN')
      throw new ForbiddenException('COMPANY_MANAGEMENT_REQUIRED');
  }
}
