import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdminMutationGuard } from '../auth/admin-mutation.guard';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { AuthenticatedMutationGuard } from '../auth/authenticated-mutation.guard';
import { LogisticsService } from './logistics.service';

@Controller('logistics')
@UseGuards(AuthGuard, AuthenticatedMutationGuard)
export class LogisticsController {
  constructor(private readonly logistics: LogisticsService) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest): Promise<unknown> {
    return { requests: await this.logistics.listForUser(request.user.id) };
  }

  @Post('requests')
  create(
    @Req() request: AuthenticatedRequest,
    @Body() body: Record<string, unknown>,
  ): Promise<unknown> {
    return this.logistics.createRequest(request.user.id, {
      dealId: String(body.dealId ?? ''),
      origin: String(body.origin ?? ''),
      destination: String(body.destination ?? ''),
      quantity: String(body.quantity ?? ''),
      unit: String(body.unit ?? ''),
      pickupWindow:
        typeof body.pickupWindow === 'string' ? body.pickupWindow : undefined,
      requirements:
        typeof body.requirements === 'string' ? body.requirements : undefined,
    });
  }

  @Post('requests/:id/quotes')
  @UseGuards(AuthGuard, AdminGuard, AdminMutationGuard)
  addQuote(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ): Promise<unknown> {
    return this.logistics.addQuote(request.user.id, id, {
      carrierName: String(body.carrierName ?? ''),
      amount: String(body.amount ?? ''),
      estimatedDays:
        typeof body.estimatedDays === 'number' &&
        Number.isInteger(body.estimatedDays) &&
        body.estimatedDays > 0 &&
        body.estimatedDays < 365
          ? body.estimatedDays
          : undefined,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
    });
  }

  @Post('requests/:id/simulate-quotes')
  async simulateQuotes(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return {
      request: await this.logistics.simulateQuotes(request.user.id, id),
    };
  }

  @Patch('requests/:id/quotes/:quoteId/accept')
  acceptQuote(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('quoteId') quoteId: string,
  ): Promise<unknown> {
    return this.logistics.acceptQuote(request.user.id, id, quoteId);
  }

  @Post('shipments/:id/simulate-next')
  async simulateNext(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return {
      shipment: await this.logistics.simulateNextEvent(request.user.id, id),
    };
  }
}

@Controller('admin/logistics')
@UseGuards(AuthGuard, AdminGuard)
export class AdminLogisticsController {
  constructor(private readonly logistics: LogisticsService) {}

  @Get()
  async list(@Query('status') status?: string): Promise<unknown> {
    return { requests: await this.logistics.listAll(status) };
  }

  @Post('shipments/:id/events')
  @UseGuards(AdminMutationGuard)
  async addEvent(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ): Promise<unknown> {
    return {
      shipment: await this.logistics.addShipmentEvent(request.user.id, id, {
        status: String(body.status ?? ''),
        description:
          typeof body.description === 'string' ? body.description : undefined,
        location: typeof body.location === 'string' ? body.location : undefined,
      }),
    };
  }
}
