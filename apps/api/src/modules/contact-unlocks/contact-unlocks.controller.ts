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
import { AuthenticatedMutationGuard } from '../auth/authenticated-mutation.guard';
import { ContactUnlocksService } from './contact-unlocks.service';

@Controller('listings/:listingId/contact-unlock')
@UseGuards(AuthGuard, AuthenticatedMutationGuard)
export class ContactUnlockController {
  constructor(private readonly contactUnlocks: ContactUnlocksService) {}

  @Get()
  status(
    @Param('listingId') listingId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<unknown> {
    return this.contactUnlocks.status(request.user.id, listingId);
  }

  @Post()
  unlock(
    @Param('listingId') listingId: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<unknown> {
    const companyId =
      body && typeof body === 'object' && 'companyId' in body
        ? (body as { companyId?: unknown }).companyId
        : undefined;
    if (typeof companyId !== 'string' || !companyId.trim())
      throw new BadRequestException('INVALID_COMPANY');
    return this.contactUnlocks.unlock(
      request.user.id,
      listingId,
      companyId.trim(),
    );
  }
}

@Controller('companies/:companyId/contact-unlocks')
@UseGuards(AuthGuard)
export class CompanyContactUnlocksController {
  constructor(private readonly contactUnlocks: ContactUnlocksService) {}

  @Get()
  async list(
    @Param('companyId') companyId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<unknown> {
    return {
      unlocks: await this.contactUnlocks.listForCompany(
        request.user.id,
        companyId,
      ),
    };
  }
}
