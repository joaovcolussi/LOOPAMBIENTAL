import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { AuthenticatedMutationGuard } from '../auth/authenticated-mutation.guard';
import { CompanyMembersService } from './company-members.service';

@Controller('companies')
@UseGuards(AuthGuard, AuthenticatedMutationGuard)
export class CompanyMembersController {
  constructor(private readonly service: CompanyMembersService) {}

  @Get(':id/members')
  async listMembers(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return { members: await this.service.listMembers(request.user.id, id) };
  }

  @Post(':id/members')
  async invite(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { email?: unknown; role?: unknown },
  ): Promise<unknown> {
    if (typeof body.email !== 'string' || !body.email)
      throw new BadRequestException('INVALID_EMAIL');
    return {
      invitation: await this.service.invite(
        request.user.id,
        id,
        body.email,
        typeof body.role === 'string' ? body.role : 'MEMBER',
      ),
    };
  }

  @Get(':id/invitations')
  async listInvitations(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return {
      invitations: await this.service.listInvitations(request.user.id, id),
    };
  }

  @Delete(':id/invitations/:invitationId')
  async revokeInvitation(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('invitationId') invitationId: string,
  ): Promise<unknown> {
    return this.service.revokeInvitation(request.user.id, id, invitationId);
  }

  @Patch(':id/members/:userId')
  async changeRole(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: { role?: unknown },
  ): Promise<unknown> {
    if (typeof body.role !== 'string')
      throw new BadRequestException('INVALID_ROLE');
    return {
      member: await this.service.changeRole(
        request.user.id,
        id,
        userId,
        body.role,
      ),
    };
  }

  @Delete(':id/members/:userId')
  async removeMember(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<unknown> {
    return this.service.removeMember(request.user.id, id, userId);
  }
}

@Controller('invitations')
@UseGuards(AuthGuard, AuthenticatedMutationGuard)
export class InvitationsController {
  constructor(private readonly service: CompanyMembersService) {}

  @Get(':token')
  async get(
    @Req() request: AuthenticatedRequest,
    @Param('token') token: string,
  ): Promise<unknown> {
    return {
      invitation: await this.service.getInvitation(request.user.id, token),
    };
  }

  @Post(':token/accept')
  async accept(
    @Req() request: AuthenticatedRequest,
    @Param('token') token: string,
  ): Promise<unknown> {
    return {
      membership: await this.service.acceptInvitation(request.user.id, token),
    };
  }
}
