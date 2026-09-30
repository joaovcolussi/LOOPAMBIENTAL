import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest } from './auth.guard';

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
    return true;
  }
}
