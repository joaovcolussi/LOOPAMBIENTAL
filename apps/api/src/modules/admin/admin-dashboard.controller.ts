import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AuthGuard } from '../auth/auth.guard';
import { AdminDashboardService } from './admin-dashboard.service';

@Controller('admin/dashboard')
@UseGuards(AuthGuard, AdminGuard)
export class AdminDashboardController {
  constructor(private readonly dashboard: AdminDashboardService) {}

  @Get('stats')
  stats() {
    return this.dashboard.getStats();
  }

  @Get('users')
  users(@Req() request: AuthenticatedRequest) {
    this.assertPlatformAdmin(request);
    return this.dashboard.listUsers();
  }

  @Patch('users/:id/role')
  async updateRole(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    this.assertPlatformAdmin(request);
    const role =
      body && typeof body === 'object' && 'platformRole' in body
        ? body.platformRole
        : undefined;
    if (role !== 'USER' && role !== 'MODERATOR' && role !== 'ADMIN') {
      throw new BadRequestException('INVALID_PLATFORM_ROLE');
    }
    if (id === request.user.id && role !== 'ADMIN') {
      throw new BadRequestException('CANNOT_REMOVE_OWN_ADMIN_ACCESS');
    }
    return this.dashboard.updateUserRole(id, role);
  }

  private assertPlatformAdmin(request: AuthenticatedRequest) {
    const configuredAdmins = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    if (
      request.user.platformRole !== 'ADMIN' &&
      !configuredAdmins.includes(request.user.email.toLowerCase())
    )
      throw new ForbiddenException('PLATFORM_ADMIN_REQUIRED');
  }
}
