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
import { ProposalsService } from './proposals.service';

type ProposalBody = {
  listingId?: unknown;
  proposerCompanyId?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  notes?: unknown;
  validUntil?: unknown;
};

@Controller('proposals')
@UseGuards(AuthGuard)
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}
  @Get()
  async list(@Req() request: AuthenticatedRequest): Promise<unknown> {
    return {
      proposals: await this.proposalsService.listForUser(request.user.id),
    };
  }
  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() body: ProposalBody,
  ): Promise<unknown> {
    const value = (key: keyof ProposalBody, max: number) =>
      typeof body[key] === 'string'
        ? (body[key] as string).trim().slice(0, max)
        : undefined;
    const listingId = value('listingId', 36),
      proposerCompanyId = value('proposerCompanyId', 36),
      quantity = value('quantity', 20),
      unitPrice = value('unitPrice', 20);
    if (!listingId || !proposerCompanyId || !quantity || !unitPrice)
      throw new BadRequestException('INVALID_PROPOSAL_DATA');
    return {
      proposal: await this.proposalsService.create(request.user.id, {
        listingId,
        proposerCompanyId,
        quantity,
        unitPrice,
        notes: value('notes', 5000),
        validUntil: value('validUntil', 40),
      }),
    };
  }
  @Get(':id')
  async find(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return { proposal: await this.proposalsService.find(request.user.id, id) };
  }
  @Post(':id/counter')
  async counter(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: ProposalBody,
  ): Promise<unknown> {
    return {
      proposal: await this.proposalsService.counter(
        request.user.id,
        id,
        this.counterInput(body),
      ),
    };
  }
  @Post(':id/accept')
  async accept(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return { deal: await this.proposalsService.accept(request.user.id, id) };
  }
  @Post(':id/reject')
  async reject(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return {
      proposal: await this.proposalsService.reject(request.user.id, id),
    };
  }
  @Post(':id/cancel')
  async cancel(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return {
      proposal: await this.proposalsService.cancel(request.user.id, id),
    };
  }
  private counterInput(body: ProposalBody) {
    const quantity =
      typeof body.quantity === 'string' ? body.quantity.trim() : '';
    const unitPrice =
      typeof body.unitPrice === 'string' ? body.unitPrice.trim() : '';
    if (!quantity || !unitPrice)
      throw new BadRequestException('INVALID_PROPOSAL_DATA');
    return {
      quantity,
      unitPrice,
      notes:
        typeof body.notes === 'string'
          ? body.notes.trim().slice(0, 5000)
          : undefined,
    };
  }
}
