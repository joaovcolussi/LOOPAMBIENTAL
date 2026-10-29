import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { CompanyReportsService } from './company-reports.service';

@Controller('companies/:companyId/reports')
@UseGuards(AuthGuard)
export class CompanyReportsController {
  constructor(private readonly reports: CompanyReportsService) {}

  @Get()
  summary(
    @Req() request: AuthenticatedRequest,
    @Param('companyId') companyId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<unknown> {
    return this.reports.summary(request.user.id, companyId, { from, to });
  }

  @Get('deals.csv')
  async dealsCsv(
    @Req() request: AuthenticatedRequest,
    @Param('companyId') companyId: string,
    @Res({ passthrough: true }) response: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const csv = await this.reports.dealsCsv(request.user.id, companyId, {
      from,
      to,
    });
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="negociacoes-loopambiental.csv"',
    );
    response.setHeader('Cache-Control', 'no-store');
    // BOM so spreadsheet apps detect UTF-8 accents.
    return `﻿${csv}`;
  }
}
