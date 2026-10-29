import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { AuthService } from '../auth/auth.service';
import { readSessionToken } from '../auth/session';
import { parsePageRequest } from '../../common/cursor-page';
import { ListingsService } from './listings.service';
import { privateDownload } from '../../common/content-disposition';
import {
  ListingSearchService,
  normalizeListingSearchFilters,
} from './listing-search.service';

@Controller('listings')
export class ListingsController {
  constructor(
    private readonly listingsService: ListingsService,
    private readonly listingSearch: ListingSearchService,
    private readonly authService: AuthService,
  ) {}

  @Get('mine')
  @UseGuards(AuthGuard)
  async findMine(
    @Req() request: AuthenticatedRequest,
    @Query('cursor') cursor?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    const page = await this.listingsService.findForUser(
      request.user.id,
      parsePageRequest(cursor, pageSize),
    );
    return { listings: page.items, pagination: page.pagination };
  }

  @Get('mine/:id')
  @UseGuards(AuthGuard)
  async findMineById(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return {
      listing: await this.listingsService.findForUserById(request.user.id, id),
    };
  }

  @Get(':slug')
  async findOne(
    @Req() request: Request,
    @Param('slug') slug: string,
  ): Promise<{ listing: unknown }> {
    const token = readSessionToken(request);
    let viewerUserId: string | undefined;
    if (token) {
      try {
        const user = await this.authService.getUserByToken(token);
        viewerUserId = user?.id;
      } catch {
        viewerUserId = undefined;
      }
    }
    return {
      listing: await this.listingsService.findPublishedBySlug(
        slug,
        viewerUserId,
      ),
    };
  }

  @Get('media/:id')
  @Header('Cache-Control', 'public, max-age=3600')
  @Header('X-Content-Type-Options', 'nosniff')
  async media(@Param('id') id: string) {
    const media = await this.listingsService.readPublishedMedia(id);
    return new StreamableFile(media.buffer, { type: media.mimeType });
  }

  @Get('media/:id/owner')
  @UseGuards(AuthGuard)
  @Header('Cache-Control', 'private, max-age=300')
  @Header('X-Content-Type-Options', 'nosniff')
  async ownedMedia(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const media = await this.listingsService.readOwnedMedia(
      request.user.id,
      id,
    );
    return new StreamableFile(media.buffer, { type: media.mimeType });
  }

  // Reports can carry commercially sensitive data, so downloads require an
  // authenticated account (no anonymous scraping).
  @Get('documents/:id')
  @UseGuards(AuthGuard)
  async document(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    return privateDownload(
      response,
      await this.listingsService.readPublishedDocument(request.user.id, id),
    );
  }

  @Get('documents/:id/owner')
  @UseGuards(AuthGuard)
  async ownedDocument(
    @Req() request: AuthenticatedRequest,
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    return privateDownload(
      response,
      await this.listingsService.readOwnedDocument(request.user.id, id),
    );
  }

  @Get()
  async findPublished(
    @Query('page') pageValue?: string,
    @Query('pageSize') pageSizeValue?: string,
    @Query('q') query?: string,
    @Query('type') type?: string,
    @Query('categoryId') categoryId?: string,
    @Query('state') state?: string,
    @Query('city') city?: string,
    @Query('verified') verified?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('sort') sort?: string,
    @Query('cursor') cursor?: string,
    @Query('attr') attr?: string | string[],
  ): Promise<unknown> {
    return this.listingSearch.search({
      filters: normalizeListingSearchFilters({
        q: query,
        type,
        categoryId,
        state,
        city,
        verified,
        minPrice,
        maxPrice,
        latitude,
        longitude,
        radiusKm,
        sort,
        attr,
      }),
      cursor,
      page: this.parsePositiveInteger(pageValue, 1),
      pageSize: this.parsePositiveInteger(pageSizeValue, 12),
    });
  }

  private parsePositiveInteger(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
