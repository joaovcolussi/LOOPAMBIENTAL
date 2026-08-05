import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { ModerationService } from './moderation.service';

@Controller('admin/moderation/cases')
@UseGuards(AuthGuard, AdminGuard)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}
  @Get()
  async list() {
    return { cases: await this.moderationService.listCases() };
  }
  @Post(':id/approve')
  async approve(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return {
      listing: await this.moderationService.approve(id, request.user.id),
    };
  }
  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() body: { reason?: unknown },
  ) {
    return {
      listing: await this.moderationService.reject(
        id,
        request.user.id,
        typeof body.reason === 'string' ? body.reason : '',
      ),
    };
  }
}
