import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import {
  LISTING_DOCUMENT_TYPES,
  ListingInput,
  ListingsService,
} from './listings.service';
import { AuthenticatedMutationGuard } from '../auth/authenticated-mutation.guard';

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
  latitude?: unknown;
  longitude?: unknown;
};

@Controller('listings')
@UseGuards(AuthGuard, AuthenticatedMutationGuard)
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
  @Post(':id/media')
  @UseInterceptors(
    FilesInterceptor('photos', 5, { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async addMedia(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<unknown> {
    return {
      media: await this.listingsService.addMedia(
        request.user.id,
        id,
        files ?? [],
      ),
    };
  }
  @Post(':id/documents')
  @UseInterceptors(
    FileInterceptor('document', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
      // Browsers send UTF-8 file names; busboy defaults to latin1.
      defParamCharset: 'utf8',
    }),
  )
  async addDocument(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: { type?: unknown; validUntil?: unknown },
  ): Promise<unknown> {
    const type =
      body.type === undefined || body.type === ''
        ? 'TECHNICAL_REPORT'
        : this.enumValue(body.type, LISTING_DOCUMENT_TYPES);
    if (!type) throw new BadRequestException('INVALID_DOCUMENT_TYPE_VALUE');
    if (
      body.validUntil !== undefined &&
      (typeof body.validUntil !== 'string' || body.validUntil.length > 10)
    )
      throw new BadRequestException('INVALID_DOCUMENT_VALIDITY');
    return {
      document: await this.listingsService.addDocument(
        request.user.id,
        id,
        file,
        { type, validUntil: body.validUntil || undefined },
      ),
    };
  }
  @Delete(':id/documents/:documentId')
  @HttpCode(204)
  async removeDocument(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('documentId') documentId: string,
  ): Promise<void> {
    await this.listingsService.removeDocument(request.user.id, id, documentId);
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
      ...this.coordinates(body),
    };
  }

  private coordinates(body: ListingBody): {
    latitude?: number;
    longitude?: number;
  } {
    const parse = (raw: unknown, min: number, max: number) => {
      if (raw === undefined) return undefined;
      const numeric = Number(raw);
      if (!Number.isFinite(numeric) || numeric < min || numeric > max)
        throw new BadRequestException('INVALID_COORDINATES');
      return numeric;
    };
    const latitude = parse(body.latitude, -90, 90);
    const longitude = parse(body.longitude, -180, 180);
    return {
      ...(latitude !== undefined ? { latitude } : {}),
      ...(longitude !== undefined ? { longitude } : {}),
    };
  }

  private enumValue<T extends string>(value: unknown, values: readonly T[]) {
    if (typeof value !== 'string') return undefined;
    const candidate = value as T;
    return values.includes(candidate) ? candidate : undefined;
  }
}
