import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  AuthService,
  SESSION_COOKIE,
  SESSION_IDLE_SECONDS,
} from './auth.service';
import { readSessionToken } from './session';

export type AuthenticatedRequest = Request & {
  user: {
    id: string;
    name: string;
    email: string;
    status: string;
    platformRole: string;
    createdAt: Date;
  };
};

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readSessionToken(request);
    const user = token ? await this.authService.getUserByToken(token) : null;
    if (!user) throw new UnauthorizedException('AUTHENTICATION_REQUIRED');
    if (token) {
      const response = context.switchToHttp().getResponse<Response>();
      const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
      response.setHeader(
        'Set-Cookie',
        `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_IDLE_SECONDS}${secure}`,
      );
    }
    request.user = user;
    return true;
  }
}
