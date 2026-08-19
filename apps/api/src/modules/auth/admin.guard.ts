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
    const isConfiguredAdmin = configuredEmails.includes(
      request.user.email.toLowerCase(),
    );
    if (request.user.platformRole !== 'ADMIN' && !isConfiguredAdmin)
      throw new ForbiddenException('PLATFORM_ADMIN_REQUIRED');
    return true;
  }
}
