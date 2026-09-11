import {
  Controller,
  Get,
  Module,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from './infrastructure/prisma.service';
import { ListingsController } from './modules/listings/listings.controller';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { AuthGuard } from './modules/auth/auth.guard';
import { CompaniesController } from './modules/companies/companies.controller';
import { CompaniesService } from './modules/companies/companies.service';
import { ListingsCommandController } from './modules/listings/listings-command.controller';
import { ListingsService } from './modules/listings/listings.service';
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
  controllers: [
    HealthController,
    ListingsController,
    ListingsCommandController,
    AuthController,
    CompaniesController,
    CategoriesController,
    MaterialsController,
    StatsController,
    ModerationController,
    FavoritesController,
    ProposalsController,
    ConversationsController,
    NotificationsController,
    AdminDashboardController,
    PaymentsController,
    LogisticsController,
    HomeCarouselController,
    AdminHomeCarouselController,
  ],
  providers: [
    PrismaService,
    AuthService,
    EmailService,
    AuthGuard,
    CompaniesService,
    ListingsService,
    AdminGuard,
    ModerationService,
    FavoritesService,
    ProposalsService,
    ConversationsService,
    NotificationsService,
    AdminDashboardService,
    PaymentsService,
    LogisticsService,
    ListingMediaStorageService,
    AdminMutationGuard,
    HomeCarouselService,
    ModerationGuard,
    AuthenticatedMutationGuard,
  ],
})
export class AppModule {}
