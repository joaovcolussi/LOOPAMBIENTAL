import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(AuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}
  @Get()
  async list(@Req() request: AuthenticatedRequest): Promise<unknown> {
    return {
      notifications: await this.notificationsService.list(request.user.id),
    };
  }
  @Post(':id/read')
  async read(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return this.notificationsService.read(request.user.id, id);
  }
  @Post('read-all')
  async readAll(@Req() request: AuthenticatedRequest): Promise<unknown> {
    return this.notificationsService.readAll(request.user.id);
  }
}
