import {
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
import { ReviewsService } from './reviews.service';

@Controller('deals/:dealId/reviews')
@UseGuards(AuthGuard, AuthenticatedMutationGuard)
export class DealReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  async list(
    @Param('dealId') dealId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<unknown> {
    return { reviews: await this.reviews.listForDeal(request.user.id, dealId) };
  }

  @Post()
  create(
    @Param('dealId') dealId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<unknown> {
    return this.reviews.create(request.user.id, dealId, body);
  }
}

@Controller('reviews')
@UseGuards(AuthGuard)
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get('pending')
  async pending(@Req() request: AuthenticatedRequest): Promise<unknown> {
    return { pending: await this.reviews.pending(request.user.id) };
  }
}

@Controller('companies/:slug/reviews')
export class PublicCompanyReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  async list(@Param('slug') slug: string): Promise<unknown> {
    return this.reviews.listForCompany(slug);
  }
}
