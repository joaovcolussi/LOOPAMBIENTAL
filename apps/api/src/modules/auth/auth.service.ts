import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
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
import type { Prisma } from '@loopambiental/database';
import { PrismaService } from '../../infrastructure/prisma.service';
import { EmailService } from './email.service';
import { PRIVACY_VERSION, TERMS_VERSION } from '../../common/legal-versions';
import { decryptField } from '../../common/field-encryption';
import { verifyTotp } from '../../common/totp';

const scrypt = promisify(nodeScrypt);
export const SESSION_COOKIE = 'loopambiental_session';
export const SESSION_IDLE_SECONDS = 20 * 60;
// A session cannot be refreshed beyond this absolute lifetime, even if the user
// stays active, so a stolen cookie eventually stops working.
export const SESSION_ABSOLUTE_SECONDS = 30 * 24 * 60 * 60;

type SessionContext = { userAgent?: string; ipAddress?: string };

const MFA_CHALLENGE_SECONDS = 5 * 60;

// Mandatory by default; local/CI environments may opt out explicitly.
export function emailVerificationRequired() {
  return process.env.REQUIRE_EMAIL_VERIFICATION !== 'false';
}

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  status: true,
  platformRole: true,
  createdAt: true,
} as const;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly emailService?: EmailService,
  ) {}

  async register(
    name: string,
    email: string,
    password: string,
    context: SessionContext,
    options: { acceptTerms?: boolean } = {},
  ) {
    if (options.acceptTerms !== true)
      throw new BadRequestException('TERMS_NOT_ACCEPTED');
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
        consents: {
          create: [
            {
              type: 'TERMS',
              version: TERMS_VERSION,
              ipAddress: context.ipAddress,
            },
            {
              type: 'PRIVACY',
              version: PRIVACY_VERSION,
              ipAddress: context.ipAddress,
            },
          ],
        },
      },
      select: publicUserSelect,
    });
    const verificationRequired = emailVerificationRequired();
    const token = verificationRequired
      ? null
      : await this.createSession(user.id, context);
    if (this.prisma.authToken) {
      const verificationToken = await this.createAuthToken(
        user.id,
        'EMAIL_VERIFICATION',
      );
      try {
        await this.emailService?.sendEmailVerification(
          user.email,
          verificationToken,
        );
      } catch (error) {
        this.logger.warn(
          `Verification email failed for ${user.email}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return { user, token, verificationRequired };
  }

  // Always answers the same way so it cannot be used to enumerate accounts.
  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true, email: true, emailVerifiedAt: true, status: true },
    });
    if (user && !user.emailVerifiedAt && user.status === 'ACTIVE') {
      const token = await this.createAuthToken(user.id, 'EMAIL_VERIFICATION');
      try {
        await this.emailService?.sendEmailVerification(user.email, token);
      } catch (error) {
        this.logger.warn(
          `Verification email failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return { requested: true };
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
    await this.prisma.$transaction(async (transaction) => {
      await this.consumeAuthToken(
        transaction,
        authToken.id,
        'INVALID_VERIFICATION_TOKEN',
      );
      await transaction.user.update({
        where: { id: authToken.userId },
        data: { emailVerifiedAt: new Date() },
      });
    });
    return { verified: true };
  }

  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (user && this.prisma.authToken) {
      const token = await this.createAuthToken(user.id, 'PASSWORD_RESET');
      try {
        await this.emailService?.sendPasswordReset(user.email, token);
      } catch (error) {
        this.logger.warn(
          `Password reset email failed for ${user.email}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
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
    await this.prisma.$transaction(async (transaction) => {
      await this.consumeAuthToken(
        transaction,
        authToken.id,
        'INVALID_RESET_TOKEN',
      );
      await transaction.user.update({
        where: { id: authToken.userId },
        data: { passwordHash },
      });
      await transaction.session.deleteMany({
        where: { userId: authToken.userId },
      });
    });
    return { reset: true };
  }

  // Marks a one-time token as used only if no concurrent request consumed it
  // first, so a verification or reset link cannot be redeemed twice.
  private async consumeAuthToken(
    transaction: Prisma.TransactionClient,
    id: string,
    errorCode: string,
  ) {
    const consumed = await transaction.authToken.updateMany({
      where: { id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) throw new UnauthorizedException(errorCode);
  }

  async login(email: string, password: string, context: SessionContext) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    // Always run a password verification to avoid a timing oracle that reveals
    // whether the account exists.
    const validPassword = await this.verifyPassword(
      password,
      user?.passwordHash ?? (await this.dummyPasswordHash()),
    );
    if (!user || !validPassword || user.status !== 'ACTIVE')
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    // Only revealed after a correct password, so it leaks nothing new.
    if (emailVerificationRequired() && !user.emailVerifiedAt)
      throw new ForbiddenException('EMAIL_NOT_VERIFIED');

    const publicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      platformRole: user.platformRole,
      createdAt: user.createdAt,
    };
    if (user.mfaEnabledAt) {
      const challengeToken = await this.createAuthToken(
        user.id,
        'MFA_CHALLENGE',
        MFA_CHALLENGE_SECONDS,
      );
      return {
        user: publicUser,
        token: null,
        mfaRequired: true,
        challengeToken,
      };
    }
    const token = await this.createSession(user.id, context);
    return { user: publicUser, token, mfaRequired: false };
  }

  /** Second login step: exchanges a challenge plus TOTP/recovery code. */
  async completeMfaLogin(
    challengeToken: string,
    code: string,
    context: SessionContext,
  ) {
    const authToken = await this.prisma.authToken.findUnique({
      where: { tokenHash: this.hashToken(challengeToken) },
      include: { user: true },
    });
    if (
      !authToken ||
      authToken.type !== 'MFA_CHALLENGE' ||
      authToken.usedAt ||
      authToken.expiresAt <= new Date() ||
      authToken.user.status !== 'ACTIVE' ||
      !authToken.user.mfaEnabledAt ||
      !authToken.user.mfaSecretEncrypted
    )
      throw new UnauthorizedException('INVALID_MFA_CHALLENGE');
    const secret = decryptField(authToken.user.mfaSecretEncrypted);
    const user = authToken.user;
    let valid = Boolean(secret && verifyTotp(secret, code));
    let remainingRecoveryCodes: string[] | null = null;
    if (!valid) {
      const hashes = Array.isArray(user.mfaRecoveryCodes)
        ? (user.mfaRecoveryCodes as string[])
        : [];
      const candidate = this.hashToken(code.trim().toUpperCase());
      if (hashes.includes(candidate)) {
        valid = true;
        remainingRecoveryCodes = hashes.filter((hash) => hash !== candidate);
      }
    }
    if (!valid) throw new UnauthorizedException('INVALID_MFA_CODE');
    await this.prisma.$transaction(async (transaction) => {
      await this.consumeAuthToken(
        transaction,
        authToken.id,
        'INVALID_MFA_CHALLENGE',
      );
      if (remainingRecoveryCodes)
        await transaction.user.update({
          where: { id: user.id },
          data: { mfaRecoveryCodes: remainingRecoveryCodes },
        });
    });
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
            emailVerifiedAt: true,
            mfaEnabledAt: true,
            createdAt: true,
          },
        },
      },
    });
    const now = Date.now();
    if (
      !session ||
      session.expiresAt <= new Date(now) ||
      session.absoluteExpiresAt <= new Date(now) ||
      session.user.status !== 'ACTIVE'
    )
      return null;

    // Sessions use a sliding idle timeout: every authenticated request grants
    // another 20 minutes, while an idle browser session expires naturally. The
    // refresh can never extend past the absolute session lifetime.
    const nextExpiry = new Date(
      Math.min(
        now + SESSION_IDLE_SECONDS * 1000,
        session.absoluteExpiresAt.getTime(),
      ),
    );
    const refreshed = await this.prisma.session.updateMany({
      where: { id: session.id, tokenHash: this.hashToken(token) },
      data: { expiresAt: nextExpiry },
    });
    if (refreshed.count === 0) return null;
    return session.user;
  }

  async revokeSession(token: string) {
    await this.prisma.session.deleteMany({
      where: { tokenHash: this.hashToken(token) },
    });
  }

  async revokeExpiredSessions() {
    const now = new Date();
    await this.prisma.session.deleteMany({
      where: {
        OR: [{ expiresAt: { lte: now } }, { absoluteExpiresAt: { lte: now } }],
      },
    });
  }

  async createSession(userId: string, context: SessionContext) {
    const token = randomBytes(32).toString('base64url');
    const now = Date.now();
    const expiresAt = new Date(now + SESSION_IDLE_SECONDS * 1000);
    const absoluteExpiresAt = new Date(now + SESSION_ABSOLUTE_SECONDS * 1000);
    await this.prisma.session.create({
      data: {
        userId,
        tokenHash: this.hashToken(token),
        expiresAt,
        absoluteExpiresAt,
        userAgent: context.userAgent,
        ipAddress: context.ipAddress,
      },
    });
    return token;
  }

  async hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    return `scrypt$${salt}$${derivedKey.toString('hex')}`;
  }

  // A syntactically valid hash with the same scrypt cost, used only to keep the
  // login response time constant for unknown accounts.
  private async dummyPasswordHash() {
    if (!this.dummyHash) this.dummyHash = await this.hashPassword('unused');
    return this.dummyHash;
  }
  private dummyHash: string | null = null;

  async verifyPassword(password: string, storedHash: string) {
    const [, salt, storedKey] = storedHash.split('$');
    if (!salt || !storedKey) return false;
    const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
    const expectedKey = Buffer.from(storedKey, 'hex');
    return (
      expectedKey.length === derivedKey.length &&
      timingSafeEqual(expectedKey, derivedKey)
    );
  }

  hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async createAuthToken(
    userId: string,
    type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'MFA_CHALLENGE',
    ttlSeconds = 60 * 60,
  ) {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.authToken.create({
      data: {
        userId,
        type,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
    });
    return token;
  }
}
