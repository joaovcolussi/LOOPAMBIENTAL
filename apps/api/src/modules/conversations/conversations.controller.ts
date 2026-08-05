import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
@UseGuards(AuthGuard)
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}
  @Get()
  async list(@Req() request: AuthenticatedRequest): Promise<unknown> {
    return {
      conversations: await this.conversationsService.list(request.user.id),
    };
  }
  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() body: { proposalId?: unknown },
  ): Promise<unknown> {
    if (typeof body.proposalId !== 'string' || !body.proposalId)
      throw new BadRequestException('PROPOSAL_REQUIRED');
    return {
      conversation: await this.conversationsService.createForProposal(
        request.user.id,
        body.proposalId,
      ),
    };
  }
  @Get(':id/messages')
  async messages(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return {
      messages: await this.conversationsService.messages(request.user.id, id),
    };
  }
  @Post(':id/messages')
  async send(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { body?: unknown },
  ): Promise<unknown> {
    if (typeof body.body !== 'string')
      throw new BadRequestException('INVALID_MESSAGE');
    return {
      message: await this.conversationsService.send(
        request.user.id,
        id,
        body.body,
      ),
    };
  }
  @Post(':id/read')
  async read(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return {
      participant: await this.conversationsService.markRead(
        request.user.id,
        id,
      ),
    };
  }
}
