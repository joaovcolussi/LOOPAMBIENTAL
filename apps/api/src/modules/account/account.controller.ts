import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { AuthenticatedMutationGuard } from '../auth/authenticated-mutation.guard';
import { AdminGuard } from '../auth/admin.guard';
import { SESSION_COOKIE } from '../auth/auth.service';
import { readSessionToken } from '../auth/session';
import { AccountService } from './account.service';

const SENSITIVE_THROTTLE = {
  default: {
    ttl: 60_000,
    limit: Number(process.env.AUTH_THROTTLE_LIMIT ?? 20),
  },
};

@Controller('me')
@UseGuards(AuthGuard, AuthenticatedMutationGuard)
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Get()
  async profile(@Req() request: AuthenticatedRequest): Promise<unknown> {
    return { user: await this.account.profile(request.user.id) };
  }

  @Patch()
  async update(
    @Req() request: AuthenticatedRequest,
    @Body() body: { name?: unknown },
  ): Promise<unknown> {
    return { user: await this.account.updateProfile(request.user.id, body) };
  }

  @Post('consents')
  async acceptTerms(@Req() request: AuthenticatedRequest): Promise<unknown> {
    return {
      user: await this.account.acceptCurrentTerms(
        request.user.id,
        request.ip?.slice(0, 64),
      ),
    };
  }

  @Post('password')
  @Throttle(SENSITIVE_THROTTLE)
  @HttpCode(200)
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() body: { currentPassword?: unknown; newPassword?: unknown },
  ) {
    return this.account.changePassword(
      request.user.id,
      readSessionToken(request),
      body,
    );
  }

  @Get('sessions')
  async sessions(@Req() request: AuthenticatedRequest): Promise<unknown> {
    return {
      sessions: await this.account.sessions(
        request.user.id,
        readSessionToken(request),
      ),
    };
  }

  @Post('sessions/revoke-others')
  @HttpCode(200)
  revokeOthers(@Req() request: AuthenticatedRequest) {
    return this.account.revokeOtherSessions(
      request.user.id,
      readSessionToken(request),
    );
  }

  @Delete('sessions/:id')
  revokeSession(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.account.revokeSession(request.user.id, id);
  }

  @Post('mfa/setup')
  @Throttle(SENSITIVE_THROTTLE)
  @HttpCode(200)
  mfaSetup(@Req() request: AuthenticatedRequest) {
    return this.account.startMfaSetup(request.user.id);
  }

  @Post('mfa/enable')
  @Throttle(SENSITIVE_THROTTLE)
  @HttpCode(200)
  mfaEnable(
    @Req() request: AuthenticatedRequest,
    @Body() body: { code?: unknown },
  ) {
    return this.account.enableMfa(request.user.id, body.code);
  }

  @Post('mfa/disable')
  @Throttle(SENSITIVE_THROTTLE)
  @HttpCode(200)
  mfaDisable(
    @Req() request: AuthenticatedRequest,
    @Body() body: { password?: unknown; code?: unknown },
  ) {
    return this.account.disableMfa(request.user.id, body);
  }

  @Get('data-export')
  async dataExport(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<unknown> {
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="meus-dados-loopambiental.json"',
    );
    response.setHeader('Cache-Control', 'no-store');
    return this.account.exportData(request.user.id);
  }

  @Post('delete-account')
  @Throttle(SENSITIVE_THROTTLE)
  @HttpCode(200)
  async deleteAccount(
    @Req() request: AuthenticatedRequest,
    @Body() body: { password?: unknown; confirmation?: unknown },
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.account.deleteAccount(request.user.id, body);
    response.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
    );
    return result;
  }
}

@Controller('admin/data-requests')
@UseGuards(AuthGuard, AdminGuard)
export class AdminDataRequestsController {
  constructor(private readonly account: AccountService) {}

  @Get()
  async list(): Promise<unknown> {
    return { requests: await this.account.listDataRequests() };
  }
}
