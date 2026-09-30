import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { AuthenticatedMutationGuard } from '../auth/authenticated-mutation.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AdminMutationGuard } from '../auth/admin-mutation.guard';
import { SavedSearchesService } from './saved-searches.service';

@Controller('saved-searches')
@UseGuards(AuthGuard, AuthenticatedMutationGuard)
export class SavedSearchesController {
  constructor(private readonly service: SavedSearchesService) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest): Promise<unknown> {
    return { savedSearches: await this.service.list(request.user.id) };
  }

  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() body: { name?: unknown; filters?: unknown; frequency?: unknown },
  ): Promise<unknown> {
    return {
      savedSearch: await this.service.create(request.user.id, body),
    };
  }

  @Get(':id/results')
  async results(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('page') pageValue?: string,
  ): Promise<unknown> {
    return this.service.results(request.user.id, id, Number(pageValue ?? 1));
  }

  @Patch(':id')
  async update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body()
    body: {
      name?: unknown;
      filters?: unknown;
      frequency?: unknown;
      isActive?: unknown;
    },
  ): Promise<unknown> {
    return {
      savedSearch: await this.service.update(request.user.id, id, body),
    };
  }

  @Delete(':id')
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return this.service.remove(request.user.id, id);
  }
}

@Controller('admin/saved-search-alerts')
@UseGuards(AuthGuard, AdminGuard)
export class AdminSavedSearchAlertsController {
  constructor(private readonly service: SavedSearchesService) {}

  @Post('run')
  @UseGuards(AdminMutationGuard)
  async run(@Body() body: { force?: unknown }): Promise<unknown> {
    return this.service.runDueAlerts(body?.force === true);
  }
}
