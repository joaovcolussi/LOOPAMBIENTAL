import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { FavoritesService } from './favorites.service';

@Controller()
@UseGuards(AuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}
  @Get('favorites')
  async list(@Req() request: AuthenticatedRequest): Promise<unknown> {
    return { favorites: await this.favoritesService.list(request.user.id) };
  }
  @Post('listings/:id/favorite')
  async add(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.favoritesService.add(request.user.id, id);
  }
  @Delete('listings/:id/favorite')
  async remove(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.favoritesService.remove(request.user.id, id);
  }
}
