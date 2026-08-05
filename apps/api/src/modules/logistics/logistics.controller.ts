import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { LogisticsService } from './logistics.service';

@Controller('logistics')
@UseGuards(AuthGuard)
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
  @UseGuards(AuthGuard, AdminGuard)
  addQuote(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ): Promise<unknown> {
    return this.logistics.addQuote(request.user.id, id, {
      carrierName: String(body.carrierName ?? ''),
      amount: String(body.amount ?? ''),
      estimatedDays:
        typeof body.estimatedDays === 'number' ? body.estimatedDays : undefined,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
    });
  }

  @Patch('requests/:id/quotes/:quoteId/accept')
  acceptQuote(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('quoteId') quoteId: string,
  ): Promise<unknown> {
    return this.logistics.acceptQuote(request.user.id, id, quoteId);
  }
}
