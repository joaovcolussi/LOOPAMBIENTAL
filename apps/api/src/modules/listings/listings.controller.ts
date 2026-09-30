import {
  Controller,
  Get,
  Header,
  Param,
  Query,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { AuthService } from '../auth/auth.service';
import { readSessionToken } from '../auth/session';
import { ListingsService } from './listings.service';
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
  async findMine(@Req() request: AuthenticatedRequest) {
    return {
      listings: await this.listingsService.findForUser(request.user.id),
    };
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
