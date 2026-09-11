import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AdminMutationGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const expectedOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
    const allowedOrigins = new Set([
      expectedOrigin,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ]);
    if (
      !request.headers.origin ||
      !allowedOrigins.has(request.headers.origin) ||
      request.headers['x-admin-action'] !== '1'
    )
      throw new ForbiddenException('ADMIN_REQUEST_VALIDATION_FAILED');
    return true;
  }
}
