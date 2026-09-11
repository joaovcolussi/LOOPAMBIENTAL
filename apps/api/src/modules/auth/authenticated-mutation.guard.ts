import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AuthenticatedMutationGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.method === 'GET' || request.method === 'HEAD') return true;
    const configuredOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
    const allowedOrigins = new Set([
      configuredOrigin,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ]);
    if (
      !request.headers.origin ||
      !allowedOrigins.has(request.headers.origin) ||
      request.headers['x-app-action'] !== '1'
    )
      throw new ForbiddenException('REQUEST_VALIDATION_FAILED');
    return true;
  }
}
