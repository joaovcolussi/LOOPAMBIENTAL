import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest } from './auth.guard';

/**
 * REQUIRE_ADMIN_MFA covers every staff surface (admin, moderation and
 * reviewer document access), not only the /admin routes.
 */
export function staffMfaSatisfied(user: { mfaEnabledAt?: Date | null }) {
  return process.env.REQUIRE_ADMIN_MFA !== 'true' || Boolean(user.mfaEnabledAt);
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const configuredEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    // The ADMIN_EMAILS allowlist only grants access to verified accounts, so a
    // freshly registered address cannot self-elevate before confirming it.
    const isConfiguredAdmin =
      request.user.emailVerifiedAt !== null &&
      configuredEmails.includes(request.user.email.toLowerCase());
    if (request.user.platformRole !== 'ADMIN' && !isConfiguredAdmin)
      throw new ForbiddenException('PLATFORM_ADMIN_REQUIRED');
    // Production deployments enforce MFA for administrators; the demo
    // environment keeps it optional so the walkthrough stays simple.
    if (!staffMfaSatisfied(request.user))
      throw new ForbiddenException('ADMIN_MFA_REQUIRED');
    return true;
  }
}
