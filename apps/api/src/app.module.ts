import { Controller, Get, Module } from '@nestjs/common';
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

@Controller('health')
class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    };
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
    ModerationController,
    FavoritesController,
    ProposalsController,
    ConversationsController,
    NotificationsController,
    AdminDashboardController,
    PaymentsController,
    LogisticsController,
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
  ],
})
export class AppModule {}
