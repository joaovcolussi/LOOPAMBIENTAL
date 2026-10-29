import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiKeyPrincipal, ApiKeysService } from './api-keys.service';

export type ApiKeyRequest = Request & { apiKey: ApiKeyPrincipal };

/**
 * Machine-to-machine authentication for ERP integrations. Only the
 * `X-Api-Key` header is accepted (never cookies), so browser CSRF does not
 * apply to these routes.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly apiKeys: ApiKeysService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<ApiKeyRequest>();
    const header = request.headers['x-api-key'];
    const secret = typeof header === 'string' ? header.trim() : '';
    const principal = secret ? await this.apiKeys.authenticate(secret) : null;
    if (!principal) throw new UnauthorizedException('INVALID_API_KEY');
    request.apiKey = principal;
    return true;
  }
}
