import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  Header,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ModerationGuard } from '../auth/moderation.guard';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { ModerationService } from './moderation.service';
import { ListingsService } from '../listings/listings.service';
import { AdminMutationGuard } from '../auth/admin-mutation.guard';
import type { Response } from 'express';
import { attachmentDisposition } from '../../common/content-disposition';

@Controller('admin/moderation/cases')
@UseGuards(AuthGuard, ModerationGuard)
export class ModerationController {
  constructor(
    private readonly moderationService: ModerationService,
    private readonly listingsService: ListingsService,
  ) {}
  @Get()
  async list(): Promise<unknown> {
    return { cases: await this.moderationService.listCases() };
  }
  @Get('media/:id')
  @Header('Cache-Control', 'private, max-age=300')
  @Header('X-Content-Type-Options', 'nosniff')
  async media(@Param('id') id: string) {
    const media = await this.listingsService.readModerationMedia(id);
    return new StreamableFile(media.buffer, { type: media.mimeType });
  }
  @Get('documents/:id')
  @Header('Cache-Control', 'private, no-store')
  @Header('X-Content-Type-Options', 'nosniff')
  @Header('Content-Security-Policy', "sandbox; default-src 'none'")
  async document(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const document = await this.listingsService.readModerationDocument(id);
    response.setHeader(
      'Content-Disposition',
      attachmentDisposition(document.fileName),
    );
    return new StreamableFile(document.buffer, { type: document.mimeType });
  }
  @Post(':id/approve')
  @UseGuards(AdminMutationGuard)
  async approve(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return {
      listing: await this.moderationService.approve(id, request.user.id),
    };
  }
  @Post(':id/reject')
  @UseGuards(AdminMutationGuard)
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
