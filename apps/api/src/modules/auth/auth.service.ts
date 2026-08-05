import {
  ConflictException,
  Injectable,
  Optional,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createHash,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { PrismaService } from '../../infrastructure/prisma.service';
import { EmailService } from './email.service';

const scrypt = promisify(nodeScrypt);
export const SESSION_COOKIE = 'loopambiental_session';
export const SESSION_IDLE_SECONDS = 20 * 60;

type SessionContext = { userAgent?: string; ipAddress?: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly emailService?: EmailService,
  ) {}

  async register(
    name: string,
    email: string,
    password: string,
    context: SessionContext,
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) throw new ConflictException('EMAIL_ALREADY_REGISTERED');

    const passwordHash = await this.hashPassword(password);
    const user = await this.prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        platformRole: true,
        createdAt: true,
      },
    });
    const token = await this.createSession(user.id, context);
    if (this.prisma.authToken) {
      const verificationToken = await this.createAuthToken(
        user.id,
        'EMAIL_VERIFICATION',
      );
      await this.emailService?.sendEmailVerification(
        user.email,
        verificationToken,
      );
    }
    return { user, token };
  }

  async verifyEmail(token: string) {
    const authToken = await this.prisma.authToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });
    if (
      !authToken ||
      authToken.type !== 'EMAIL_VERIFICATION' ||
      authToken.usedAt ||
      authToken.expiresAt <= new Date()
    )
      throw new UnauthorizedException('INVALID_VERIFICATION_TOKEN');
    await this.prisma.$transaction([
      this.prisma.authToken.update({
        where: { id: authToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: authToken.userId },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);
    return { verified: true };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (user && this.prisma.authToken) {
      const token = await this.createAuthToken(user.id, 'PASSWORD_RESET');
      await this.emailService?.sendPasswordReset(user.email, token);
    }
    return { requested: true };
  }

  async resetPassword(token: string, password: string) {
    const authToken = await this.prisma.authToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
    });
    if (
      !authToken ||
      authToken.type !== 'PASSWORD_RESET' ||
      authToken.usedAt ||
      authToken.expiresAt <= new Date()
    )
      throw new UnauthorizedException('INVALID_RESET_TOKEN');
    const passwordHash = await this.hashPassword(password);
    await this.prisma.$transaction([
      this.prisma.authToken.update({
        where: { id: authToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: authToken.userId },
        data: { passwordHash },
      }),
      this.prisma.session.deleteMany({ where: { userId: authToken.userId } }),
    ]);
    return { reset: true };
  }

  async login(email: string, password: string, context: SessionContext) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    const validPassword = user?.passwordHash
      ? await this.verifyPassword(password, user.passwordHash)
      : false;
    if (!user || !validPassword || user.status !== 'ACTIVE')
      throw new UnauthorizedException('INVALID_CREDENTIALS');

    const token = await this.createSession(user.id, context);
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        platformRole: user.platformRole,
        createdAt: user.createdAt,
      },
      token,
    };
  }

  async getUserByToken(token: string) {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true,
            platformRole: true,
            createdAt: true,
          },
        },
      },
    });
    if (
      !session ||
      session.expiresAt <= new Date() ||
      session.user.status !== 'ACTIVE'
    )
      return null;

    // Sessions use a sliding idle timeout: every authenticated request grants
    // another 20 minutes, while an idle browser session expires naturally.
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        expiresAt: new Date(Date.now() + SESSION_IDLE_SECONDS * 1000),
      },
    });
    return session.user;
  }

  async revokeSession(token: string) {
    await this.prisma.session.deleteMany({
      where: { tokenHash: this.hashToken(token) },
    });
  }

  async revokeExpiredSessions() {
    await this.prisma.session.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });
  }

  private async createSession(userId: string, context: SessionContext) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_IDLE_SECONDS * 1000);
    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: this.hashToken(token),
        expiresAt,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
      },
    });
    return token;
  }

  private async hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    return `scrypt$${salt}$${derivedKey.toString('hex')}`;
  }

  private async verifyPassword(password: string, storedHash: string) {
    const [, salt, storedKey] = storedHash.split('$');
    if (!salt || !storedKey) return false;
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    const expectedKey = Buffer.from(storedKey, 'hex');
    return (
      expectedKey.length === derivedKey.length &&
      timingSafeEqual(expectedKey, derivedKey)
    );
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async createAuthToken(
    userId: string,
    type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET',
  ) {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.authToken.create({
      data: {
        userId,
        type,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    return token;
  }
}
