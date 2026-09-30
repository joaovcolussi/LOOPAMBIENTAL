import {
  Controller,
  Get,
  Module,
  ServiceUnavailableException,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './infrastructure/prisma.service';
import { OutboxService } from './infrastructure/outbox.service';
import { ListingsController } from './modules/listings/listings.controller';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { AuthGuard } from './modules/auth/auth.guard';
import {
  CompaniesController,
  PublicCompaniesController,
} from './modules/companies/companies.controller';
import { CompaniesService } from './modules/companies/companies.service';
import { ListingsCommandController } from './modules/listings/listings-command.controller';
import { ListingsService } from './modules/listings/listings.service';
import { ListingSearchService } from './modules/listings/listing-search.service';
import {
  CategoriesController,
  MaterialsController,
} from './modules/catalog/catalog.controller';
import { StatsController } from './modules/catalog/stats.controller';
import { AdminGuard } from './modules/auth/admin.guard';
import { ModerationController } from './modules/moderation/moderation.controller';
import { ModerationService } from './modules/moderation/moderation.service';
import { FavoritesController } from './modules/favorites/favorites.controller';
import { FavoritesService } from './modules/favorites/favorites.service';
import { ProposalsController } from './modules/proposals/proposals.controller';
import { ProposalsService } from './modules/proposals/proposals.service';
import { ConversationsController } from './modules/conversations/conversations.controller';
import { ConversationsService } from './modules/conversations/conversations.service';
import { NotificationsController } from './modules/notifications/notifications.controller';
import { NotificationsService } from './modules/notifications/notifications.service';
import { EmailService } from './modules/auth/email.service';
import { AdminDashboardController } from './modules/admin/admin-dashboard.controller';
import { AdminDashboardService } from './modules/admin/admin-dashboard.service';
import { AdminResourcesController } from './modules/admin/admin-resources.controller';
import { AdminResourcesService } from './modules/admin/admin-resources.service';
import { PaymentsController } from './modules/payments/payments.controller';
import { PaymentsService } from './modules/payments/payments.service';
import { LogisticsController } from './modules/logistics/logistics.controller';
import { LogisticsService } from './modules/logistics/logistics.service';
import { ListingMediaStorageService } from './infrastructure/listing-media-storage.service';
import { AdminMutationGuard } from './modules/auth/admin-mutation.guard';
import {
  AdminHomeCarouselController,
  HomeCarouselController,
} from './modules/home-carousel/home-carousel.controller';
import { HomeCarouselService } from './modules/home-carousel/home-carousel.service';
import { ModerationGuard } from './modules/auth/moderation.guard';
import { AuthenticatedMutationGuard } from './modules/auth/authenticated-mutation.guard';
import {
  AdminCompanyVerificationController,
  CompanyDocumentController,
} from './modules/company-verification/company-verification.controller';
import { CompanyVerificationService } from './modules/company-verification/company-verification.service';
import {
  CompanyMembersController,
  InvitationsController,
} from './modules/company-members/company-members.controller';
import { CompanyMembersService } from './modules/company-members/company-members.service';
import {
  AdminReportsController,
  ReportsController,
} from './modules/reports/reports.controller';
import { ReportsService } from './modules/reports/reports.service';
import {
  AdminSavedSearchAlertsController,
  SavedSearchesController,
} from './modules/saved-searches/saved-searches.controller';
import { SavedSearchesService } from './modules/saved-searches/saved-searches.service';
import {
  PlansController,
  SubscriptionsController,
} from './modules/subscriptions/subscriptions.controller';
import { SubscriptionsService } from './modules/subscriptions/subscriptions.service';
import {
  CompanyContactUnlocksController,
  ContactUnlockController,
} from './modules/contact-unlocks/contact-unlocks.controller';
import { ContactUnlocksService } from './modules/contact-unlocks/contact-unlocks.service';
import {
  DealReviewsController,
  PublicCompanyReviewsController,
  ReviewsController,
} from './modules/reviews/reviews.controller';
import { ReviewsService } from './modules/reviews/reviews.service';

@Controller('health')
class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        service: 'api',
        database: 'ok',
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException('DATABASE_UNAVAILABLE');
    }
  }
}

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: Number(process.env.THROTTLE_LIMIT ?? 120),
      },
    ]),
  ],
  controllers: [
    HealthController,
    ListingsController,
    ListingsCommandController,
    AuthController,
    CompaniesController,
    PublicCompaniesController,
    CategoriesController,
    MaterialsController,
    StatsController,
    ModerationController,
    FavoritesController,
    ProposalsController,
    ConversationsController,
    NotificationsController,
    AdminDashboardController,
    AdminResourcesController,
    PaymentsController,
    LogisticsController,
    HomeCarouselController,
    AdminHomeCarouselController,
    CompanyDocumentController,
    AdminCompanyVerificationController,
    CompanyMembersController,
    InvitationsController,
    ReportsController,
    AdminReportsController,
    SavedSearchesController,
    AdminSavedSearchAlertsController,
    PlansController,
    SubscriptionsController,
    ContactUnlockController,
    CompanyContactUnlocksController,
    DealReviewsController,
    ReviewsController,
    PublicCompanyReviewsController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    PrismaService,
    OutboxService,
    AuthService,
    EmailService,
    AuthGuard,
    CompaniesService,
    ListingsService,
    ListingSearchService,
    AdminGuard,
    ModerationService,
    FavoritesService,
    ProposalsService,
    ConversationsService,
    NotificationsService,
    AdminDashboardService,
    AdminResourcesService,
    PaymentsService,
    LogisticsService,
    ListingMediaStorageService,
    AdminMutationGuard,
    HomeCarouselService,
    ModerationGuard,
    AuthenticatedMutationGuard,
    CompanyVerificationService,
    CompanyMembersService,
    ReportsService,
    SavedSearchesService,
    SubscriptionsService,
    ContactUnlocksService,
    ReviewsService,
  ],
})
export class AppModule {}
