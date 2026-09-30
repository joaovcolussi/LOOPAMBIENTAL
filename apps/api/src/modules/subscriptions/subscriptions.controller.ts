import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { AuthenticatedMutationGuard } from '../auth/authenticated-mutation.guard';
import { SubscriptionsService } from './subscriptions.service';

@Controller('plans')
export class PlansController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get()
  async list(): Promise<unknown> {
    return { plans: await this.subscriptions.listPlans() };
  }
}

@Controller('companies/:companyId/subscription')
@UseGuards(AuthGuard, AuthenticatedMutationGuard)
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get()
  get(
    @Param('companyId') companyId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<unknown> {
    return this.subscriptions.getForCompany(request.user.id, companyId);
  }

  @Post()
  activate(
    @Param('companyId') companyId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<unknown> {
    const planId =
      body && typeof body === 'object' && 'planId' in body
        ? (body as { planId?: unknown }).planId
        : undefined;
    if (typeof planId !== 'string' || !planId.trim())
      throw new BadRequestException('INVALID_PLAN');
    return this.subscriptions.activate(
      request.user.id,
      companyId,
      planId.trim(),
    );
  }

  @Delete()
  cancel(
    @Param('companyId') companyId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<unknown> {
    return this.subscriptions.cancel(request.user.id, companyId);
  }
}
