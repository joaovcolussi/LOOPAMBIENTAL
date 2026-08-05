import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  @UseGuards(AuthGuard)
  async list(@Req() request: AuthenticatedRequest): Promise<unknown> {
    return { payments: await this.payments.listForUser(request.user.id) };
  }

  @Post('checkout')
  @UseGuards(AuthGuard)
  checkout(
    @Req() request: AuthenticatedRequest,
    @Body() body: { dealId?: unknown },
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<unknown> {
    return this.payments.createCheckout(
      request.user.id,
      typeof body.dealId === 'string' ? body.dealId : '',
      idempotencyKey ?? '',
    );
  }

  @Post('webhook/mercadopago')
  webhook(
    @Headers('x-signature') signature: string | undefined,
    @Headers('x-request-id') requestId: string | undefined,
    @Req() request: { query: { type?: string; 'data.id'?: string } },
  ) {
    return this.payments.handleWebhook(
      signature,
      requestId,
      request.query['data.id'],
      request.query.type,
    );
  }
}
