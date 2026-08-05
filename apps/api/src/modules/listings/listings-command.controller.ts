import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { ListingInput, ListingsService } from './listings.service';

type ListingBody = {
  companyId?: unknown;
  categoryId?: unknown;
  materialId?: unknown;
  type?: unknown;
  title?: unknown;
  description?: unknown;
  quantity?: unknown;
  unit?: unknown;
  unitPrice?: unknown;
  frequency?: unknown;
  riskClassification?: unknown;
  originDetails?: unknown;
  ownTransport?: unknown;
  requiresDocuments?: unknown;
  city?: unknown;
  state?: unknown;
};

@Controller('listings')
@UseGuards(AuthGuard)
export class ListingsCommandController {
  constructor(private readonly listingsService: ListingsService) {}
  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() body: ListingBody,
  ): Promise<unknown> {
    const input = this.validate(body, true);
    if (
      !input.companyId ||
      !input.categoryId ||
      !input.type ||
      !input.title ||
      !input.quantity ||
      !input.unit
    )
      throw new BadRequestException('INVALID_LISTING_DATA');
    return {
      listing: await this.listingsService.create(
        request.user.id,
        input as ListingInput,
      ),
    };
  }
  @Patch(':id')
  async update(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: ListingBody,
  ): Promise<unknown> {
    return {
      listing: await this.listingsService.update(
        request.user.id,
        id,
        this.validate(body, false),
      ),
    };
  }
  @Post(':id/submit')
  async submit(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return { listing: await this.listingsService.submit(request.user.id, id) };
  }
  @Post(':id/pause')
  async pause(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return { listing: await this.listingsService.pause(request.user.id, id) };
  }
  @Post(':id/close')
  async close(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<unknown> {
    return { listing: await this.listingsService.close(request.user.id, id) };
  }

  private validate(
    body: ListingBody,
    required: boolean,
  ): Partial<ListingInput> {
    const value = (key: keyof ListingBody, max: number) =>
      typeof body[key] === 'string'
        ? (body[key] as string).trim().slice(0, max)
        : undefined;
    const companyId = value('companyId', 36),
      categoryId = value('categoryId', 36),
      type = value('type', 4),
      title = value('title', 180),
      quantity = value('quantity', 20),
      unit = value('unit', 20);
    if (
      required &&
      (!companyId ||
        !categoryId ||
        !title ||
        !quantity ||
        !unit ||
        (type !== 'BUY' && type !== 'SELL'))
    )
      throw new BadRequestException('INVALID_LISTING_DATA');
    return {
      ...(companyId ? { companyId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(type === 'BUY' || type === 'SELL' ? { type } : {}),
      ...(title ? { title } : {}),
      ...(quantity ? { quantity } : {}),
      ...(unit ? { unit } : {}),
      materialId: value('materialId', 36),
      description: value('description', 5000),
      unitPrice: value('unitPrice', 20),
      frequency: this.enumValue(body.frequency, [
        'ONE_TIME',
        'WEEKLY',
        'MONTHLY',
        'CONTINUOUS',
      ] as const),
      riskClassification: this.enumValue(body.riskClassification, [
        'NON_HAZARDOUS',
        'HAZARDOUS',
        'UNKNOWN',
      ] as const),
      originDetails: value('originDetails', 240),
      ownTransport:
        typeof body.ownTransport === 'boolean' ? body.ownTransport : undefined,
      requiresDocuments:
        typeof body.requiresDocuments === 'boolean'
          ? body.requiresDocuments
          : undefined,
      city: value('city', 120),
      state: value('state', 2),
    };
  }

  private enumValue<T extends string>(value: unknown, values: readonly T[]) {
    if (typeof value !== 'string') return undefined;
    const candidate = value as T;
    return values.includes(candidate) ? candidate : undefined;
  }
}
