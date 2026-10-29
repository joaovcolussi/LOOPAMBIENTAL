import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { ListingRecommendationsService } from './listing-recommendations.service';

@Controller('recommendations')
@UseGuards(AuthGuard)
export class ListingRecommendationsController {
  constructor(
    private readonly recommendations: ListingRecommendationsService,
  ) {}

  @Get()
  list(@Req() request: AuthenticatedRequest): Promise<unknown> {
    return this.recommendations.forUser(request.user.id);
  }
}
