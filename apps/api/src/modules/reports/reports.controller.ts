import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { AuthenticatedMutationGuard } from '../auth/authenticated-mutation.guard';
import { AdminMutationGuard } from '../auth/admin-mutation.guard';
import { ModerationGuard } from '../auth/moderation.guard';
import { ReportsService } from './reports.service';

type ReportBody = {
  targetType?: unknown;
  listingId?: unknown;
  companyId?: unknown;
  reportedUserId?: unknown;
  messageId?: unknown;
  reason?: unknown;
  details?: unknown;
};

@Controller('reports')
@UseGuards(AuthGuard, AuthenticatedMutationGuard)
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() body: ReportBody,
  ): Promise<unknown> {
    if (typeof body.targetType !== 'string' || typeof body.reason !== 'string')
      throw new BadRequestException('INVALID_REPORT');
    const optional = (value: unknown) =>
      typeof value === 'string' && value ? value : undefined;
    return {
      report: await this.service.create(request.user.id, {
        targetType: body.targetType,
        listingId: optional(body.listingId),
        companyId: optional(body.companyId),
        reportedUserId: optional(body.reportedUserId),
        messageId: optional(body.messageId),
        reason: body.reason,
        details:
          typeof body.details === 'string'
            ? body.details.slice(0, 2000)
            : undefined,
      }),
    };
  }
}

@Controller('admin/reports')
@UseGuards(AuthGuard, ModerationGuard)
export class AdminReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get()
  async list(): Promise<unknown> {
    return { reports: await this.service.listAdmin() };
  }

  @Post(':id/resolve')
  @UseGuards(AdminMutationGuard)
  async resolve(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { status?: unknown; notes?: unknown },
  ): Promise<unknown> {
    if (typeof body.status !== 'string')
      throw new BadRequestException('INVALID_REPORT_STATUS');
    return {
      report: await this.service.resolve(
        request.user.id,
        id,
        body.status,
        typeof body.notes === 'string' ? body.notes : undefined,
      ),
    };
  }
}
