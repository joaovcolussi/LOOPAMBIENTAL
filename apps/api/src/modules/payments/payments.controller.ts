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
import { AuthenticatedMutationGuard } from '../auth/authenticated-mutation.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  @UseGuards(AuthGuard, AuthenticatedMutationGuard)
  async list(@Req() request: AuthenticatedRequest): Promise<unknown> {
    return { payments: await this.payments.listForUser(request.user.id) };
  }

  @Get('provider')
  provider() {
    return { provider: this.payments.providerName };
  }

  @Post('checkout')
  @UseGuards(AuthGuard, AuthenticatedMutationGuard)
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

  @Get(':id')
  @UseGuards(AuthGuard)
  async get(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return { payment: await this.payments.getForUser(request.user.id, id) };
  }

  @Post(':id/simulate')
  @UseGuards(AuthGuard, AuthenticatedMutationGuard)
  async simulate(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { outcome?: unknown },
  ): Promise<unknown> {
    return {
      payment: await this.payments.simulate(
        request.user.id,
        id,
        typeof body.outcome === 'string' ? body.outcome : '',
      ),
    };
  }
}
