import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AdminMutationGuard } from '../auth/admin-mutation.guard';
import { AdminResourcesService } from './admin-resources.service';
import { parsePageSize } from './admin-pagination';

@Controller('admin')
@UseGuards(AuthGuard, AdminGuard)
export class AdminResourcesController {
  constructor(private readonly resources: AdminResourcesService) {}

  @Get('users')
  users(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('platformRole') platformRole?: string,
    @Query('cursor') cursor?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<unknown> {
    return this.resources.listUsers({
      q,
      status,
      platformRole,
      cursor,
      pageSize: parsePageSize(pageSize),
    });
  }

  @Get('companies')
  companies(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('verification') verification?: string,
    @Query('cursor') cursor?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<unknown> {
    return this.resources.listCompanies({
      q,
      status,
      verification,
      cursor,
      pageSize: parsePageSize(pageSize),
    });
  }

  @Patch('companies/:id/status')
  @UseGuards(AdminMutationGuard)
  updateCompanyStatus(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<unknown> {
    const status =
      body && typeof body === 'object' && 'status' in body
        ? (body as { status?: unknown }).status
        : undefined;
    if (!status) throw new BadRequestException('INVALID_COMPANY_STATUS');
    return this.resources.updateCompanyStatus(request.user.id, id, status);
  }

  @Get('listings')
  listings(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('categoryId') categoryId?: string,
    @Query('cursor') cursor?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<unknown> {
    return this.resources.listListings({
      q,
      status,
      type,
      categoryId,
      cursor,
      pageSize: parsePageSize(pageSize),
    });
  }

  @Post('listings/:id/take-down')
  @UseGuards(AdminMutationGuard)
  takeDownListing(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<unknown> {
    const reason =
      body && typeof body === 'object' && 'reason' in body
        ? (body as { reason?: unknown }).reason
        : undefined;
    return this.resources.takeDownListing(request.user.id, id, reason);
  }

  @Get('payments')
  payments(
    @Query('status') status?: string,
    @Query('cursor') cursor?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<unknown> {
    return this.resources.listPayments({
      status,
      cursor,
      pageSize: parsePageSize(pageSize),
    });
  }

  @Get('plans')
  async plans(): Promise<unknown> {
    return { plans: await this.resources.listPlans() };
  }

  @Get('subscriptions')
  subscriptions(
    @Query('status') status?: string,
    @Query('cursor') cursor?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<unknown> {
    return this.resources.listSubscriptions({
      status,
      cursor,
      pageSize: parsePageSize(pageSize),
    });
  }

  @Get('audit-logs')
  auditLogs(
    @Query('action') action?: string,
    @Query('resourceType') resourceType?: string,
    @Query('resourceId') resourceId?: string,
    @Query('cursor') cursor?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<unknown> {
    return this.resources.listAuditLogs({
      action,
      resourceType,
      resourceId,
      cursor,
      pageSize: parsePageSize(pageSize),
    });
  }

  @Get('settings')
  async settings(): Promise<unknown> {
    return { settings: await this.resources.getSettings() };
  }

  @Put('settings/:key')
  @UseGuards(AdminMutationGuard)
  updateSetting(
    @Param('key') key: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<unknown> {
    const value =
      body && typeof body === 'object' && 'value' in body
        ? (body as { value?: unknown }).value
        : undefined;
    return this.resources.updateSetting(request.user.id, key, value);
  }
}
