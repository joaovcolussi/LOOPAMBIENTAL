import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { AuthenticatedMutationGuard } from '../auth/authenticated-mutation.guard';
import { ApiKeyGuard, ApiKeyRequest } from './api-key.guard';
import { ApiKeysService } from './api-keys.service';
import { IMPORT_HEADER, IntegrationsService } from './integrations.service';

/** Session-authenticated management used by /dashboard/integracoes. */
@Controller('companies/:companyId')
@UseGuards(AuthGuard, AuthenticatedMutationGuard)
export class CompanyIntegrationsController {
  constructor(
    private readonly apiKeys: ApiKeysService,
    private readonly integrations: IntegrationsService,
  ) {}

  @Get('api-keys')
  async listKeys(
    @Req() request: AuthenticatedRequest,
    @Param('companyId') companyId: string,
  ): Promise<unknown> {
    return { keys: await this.apiKeys.list(request.user.id, companyId) };
  }

  @Post('api-keys')
  createKey(
    @Req() request: AuthenticatedRequest,
    @Param('companyId') companyId: string,
    @Body() body: { name?: unknown },
  ): Promise<unknown> {
    return this.apiKeys.create(request.user.id, companyId, body.name);
  }

  @Delete('api-keys/:keyId')
  revokeKey(
    @Req() request: AuthenticatedRequest,
    @Param('companyId') companyId: string,
    @Param('keyId') keyId: string,
  ) {
    return this.apiKeys.revoke(request.user.id, companyId, keyId);
  }

  @Get('listings/export.csv')
  async exportListings(
    @Req() request: AuthenticatedRequest,
    @Param('companyId') companyId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const csv = await this.integrations.exportListingsCsv(
      request.user.id,
      companyId,
    );
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="anuncios-loopambiental.csv"',
    );
    return `﻿${csv}`;
  }

  @Get('listings/import-template.csv')
  template(@Res({ passthrough: true }) response: Response) {
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="modelo-importacao-anuncios.csv"',
    );
    return `﻿${IMPORT_HEADER.join(';')}\nVENDA;Aparas de PET cristal;plastico;1200;kg;2,10;Campinas;SP;Material limpo e enfardado\n`;
  }

  @Post('listings/import')
  importListings(
    @Req() request: AuthenticatedRequest,
    @Param('companyId') companyId: string,
    @Body() body: { csv?: unknown; submit?: unknown },
  ): Promise<unknown> {
    return this.integrations.importListingsCsv(
      request.user.id,
      companyId,
      body.csv,
      body.submit === true,
    );
  }
}

/**
 * ERP / public integration API (X-Api-Key). Versioned under
 * /api/v1/integrations; documented at /desenvolvedores.
 */
@Controller('integrations')
@UseGuards(ApiKeyGuard)
export class ErpIntegrationController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get('company')
  async company(@Req() request: ApiKeyRequest): Promise<unknown> {
    return {
      company: await this.integrations.companyProfile(request.apiKey.companyId),
    };
  }

  @Get('listings')
  async listings(@Req() request: ApiKeyRequest): Promise<unknown> {
    return {
      listings: await this.integrations.companyListings(
        request.apiKey.companyId,
      ),
    };
  }

  @Get('deals')
  async deals(@Req() request: ApiKeyRequest): Promise<unknown> {
    return {
      deals: await this.integrations.companyDeals(request.apiKey.companyId),
    };
  }

  @Post('listings/import')
  importListings(
    @Req() request: ApiKeyRequest,
    @Body() body: { csv?: unknown; submit?: unknown },
  ): Promise<unknown> {
    if (typeof body.csv !== 'string')
      throw new BadRequestException('INVALID_CSV');
    return this.integrations.importListingsCsv(
      request.apiKey.userId,
      request.apiKey.companyId,
      body.csv,
      body.submit === true,
    );
  }
}
