import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedRequest } from './auth.guard';

@Injectable()
export class ModerationGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const configuredAdmins = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    if (
      request.user.platformRole !== 'ADMIN' &&
      request.user.platformRole !== 'MODERATOR' &&
      !configuredAdmins.includes(request.user.email.toLowerCase())
    )
      throw new ForbiddenException('MODERATION_ACCESS_REQUIRED');
    return true;
  }
}
