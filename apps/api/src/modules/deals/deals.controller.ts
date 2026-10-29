import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { AuthenticatedMutationGuard } from '../auth/authenticated-mutation.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AdminMutationGuard } from '../auth/admin-mutation.guard';
import { DealsService } from './deals.service';

type ReasonBody = { reason?: unknown };

function reasonOf(body: ReasonBody | undefined) {
  return typeof body?.reason === 'string' ? body.reason : undefined;
}

@Controller('deals')
@UseGuards(AuthGuard, AuthenticatedMutationGuard)
export class DealsController {
  constructor(private readonly deals: DealsService) {}

  @Get()
  list(
    @Req() request: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('cursor') cursor?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<unknown> {
    return this.deals.list(request.user.id, {
      status: status || undefined,
      cursor: cursor || undefined,
      pageSize: pageSize ? Number(pageSize) || undefined : undefined,
    });
  }

  @Get(':id')
  async get(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return { deal: await this.deals.get(request.user.id, id) };
  }

  // One route per transition keeps the state machine explicit in the API.
  @Post(':id/request-documents')
  async requestDocuments(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return {
      deal: await this.deals.transition(
        request.user.id,
        id,
        'request-documents',
      ),
    };
  }

  @Post(':id/confirm-documents')
  async confirmDocuments(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return {
      deal: await this.deals.transition(
        request.user.id,
        id,
        'confirm-documents',
      ),
    };
  }

  @Post(':id/confirm-shipment')
  async confirmShipment(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return {
      deal: await this.deals.transition(
        request.user.id,
        id,
        'confirm-shipment',
      ),
    };
  }

  @Post(':id/confirm-delivery')
  async confirmDelivery(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return {
      deal: await this.deals.transition(
        request.user.id,
        id,
        'confirm-delivery',
      ),
    };
  }

  @Post(':id/complete')
  async complete(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return {
      deal: await this.deals.transition(request.user.id, id, 'complete'),
    };
  }

  @Post(':id/dispute')
  async dispute(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: ReasonBody,
  ): Promise<unknown> {
    return {
      deal: await this.deals.transition(
        request.user.id,
        id,
        'dispute',
        reasonOf(body),
      ),
    };
  }

  @Post(':id/cancel')
  async cancel(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: ReasonBody,
  ): Promise<unknown> {
    return {
      deal: await this.deals.transition(
        request.user.id,
        id,
        'cancel',
        reasonOf(body),
      ),
    };
  }
}

@Controller('admin/deals')
@UseGuards(AuthGuard, AdminGuard)
export class AdminDealsController {
  constructor(private readonly deals: DealsService) {}

  @Get('disputes')
  async disputes(): Promise<unknown> {
    return { deals: await this.deals.listDisputes() };
  }

  @Post(':id/resolve-dispute')
  @UseGuards(AdminMutationGuard)
  resolve(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { resolution?: unknown; notes?: unknown },
  ): Promise<unknown> {
    return this.deals.resolveDispute(
      request.user.id,
      id,
      typeof body.resolution === 'string' ? body.resolution : '',
      typeof body.notes === 'string' ? body.notes : undefined,
    );
  }
}
