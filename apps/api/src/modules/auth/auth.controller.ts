import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  AuthService,
  SESSION_COOKIE,
  SESSION_IDLE_SECONDS,
} from './auth.service';
import { readSessionToken } from './session';

type CredentialsBody = { name?: unknown; email?: unknown; password?: unknown };
type TokenBody = { token?: unknown; email?: unknown; password?: unknown };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() body: CredentialsBody,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { name, email, password } = this.validateCredentials(body, true);
    const result = await this.authService.register(
      name,
      email,
      password,
      this.context(request),
    );
    this.setSessionCookie(response, result.token);
    return { user: result.user };
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: CredentialsBody,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { email, password } = this.validateCredentials(body, false);
    const result = await this.authService.login(
      email,
      password,
      this.context(request),
    );
    this.setSessionCookie(response, result.token);
    return { user: result.user };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = readSessionToken(request);
    if (token) await this.authService.revokeSession(token);
    this.clearSessionCookie(response);
  }

  @Get('me')
  async me(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = readSessionToken(request);
    const user = token ? await this.authService.getUserByToken(token) : null;
    if (!user) throw new UnauthorizedException('AUTHENTICATION_REQUIRED');
    if (token) this.setSessionCookie(response, token);
    return { user };
  }

  @Post('verify-email')
  async verifyEmail(@Body() body: TokenBody) {
    if (typeof body.token !== 'string' || !body.token)
      throw new BadRequestException('TOKEN_REQUIRED');
    return this.authService.verifyEmail(body.token);
  }

  @Post('forgot-password')
  @HttpCode(200)
  async forgotPassword(@Body() body: TokenBody) {
    if (typeof body.email !== 'string' || !/^\S+@\S+\.\S+$/.test(body.email))
      throw new BadRequestException('INVALID_EMAIL');
    return this.authService.requestPasswordReset(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: TokenBody) {
    if (
      typeof body.token !== 'string' ||
      typeof body.password !== 'string' ||
      body.password.length < 8 ||
      body.password.length > 128
    )
      throw new BadRequestException('INVALID_RESET_DATA');
    return this.authService.resetPassword(body.token, body.password);
  }

  private validateCredentials(body: CredentialsBody, includeName: boolean) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (
      (includeName && (name.length < 2 || name.length > 150)) ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      password.length < 8 ||
      password.length > 128
    ) {
      throw new BadRequestException('INVALID_CREDENTIALS_FORMAT');
    }
    return { name, email, password };
  }

  private context(request: Request) {
    return {
      userAgent: request.get('user-agent')?.slice(0, 500),
      ipAddress: request.ip?.slice(0, 64),
    };
  }

  private setSessionCookie(response: Response, token: string) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    response.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_IDLE_SECONDS}${secure}`,
    );
  }

  private clearSessionCookie(response: Response) {
    response.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
    );
  }
}
