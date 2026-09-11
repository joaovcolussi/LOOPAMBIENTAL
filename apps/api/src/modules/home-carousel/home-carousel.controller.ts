import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Put,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard, AuthenticatedRequest } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { AdminMutationGuard } from '../auth/admin-mutation.guard';
import { HomeCarouselService } from './home-carousel.service';

@Controller('home-carousel')
export class HomeCarouselController {
  constructor(private readonly carousel: HomeCarouselService) {}

  @Get('slides')
  @Header('Cache-Control', 'public, max-age=30, stale-while-revalidate=300')
  async list() {
    return { slides: await this.carousel.listPublic() };
  }

  @Get('slides/:position/image/:sha256')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  @Header('X-Content-Type-Options', 'nosniff')
  async image(
    @Param('position') positionValue: string,
    @Param('sha256') sha256: string,
  ) {
    const image = await this.carousel.read(Number(positionValue), sha256);
    return new StreamableFile(image.buffer, { type: image.mimeType });
  }
}

@Controller('admin/home-carousel')
@UseGuards(AuthGuard, AdminGuard)
export class AdminHomeCarouselController {
  constructor(private readonly carousel: HomeCarouselService) {}

  @Get('slides')
  async list() {
    return { slides: await this.carousel.listAdmin() };
  }

  @Put('slides/:position')
  @UseGuards(AdminMutationGuard)
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async replace(
    @Req() request: AuthenticatedRequest,
    @Param('position') positionValue: string,
    @Body() body: { altText?: unknown; expectedVersion?: unknown },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const expectedVersion = Number(body.expectedVersion);
    if (
      !file ||
      typeof body.altText !== 'string' ||
      !Number.isInteger(expectedVersion) ||
      expectedVersion < 0
    )
      throw new BadRequestException('INVALID_CAROUSEL_DATA');
    return {
      slide: await this.carousel.replace(
        request.user.id,
        Number(positionValue),
        expectedVersion,
        body.altText,
        file,
      ),
    };
  }

  @Delete('slides/:position')
  @UseGuards(AdminMutationGuard)
  async reset(
    @Req() request: AuthenticatedRequest,
    @Param('position') positionValue: string,
    @Body() body: { expectedVersion?: unknown },
  ) {
    const expectedVersion = Number(body.expectedVersion);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 0)
      throw new BadRequestException('INVALID_CAROUSEL_DATA');
    return this.carousel.reset(
      request.user.id,
      Number(positionValue),
      expectedVersion,
    );
  }
}
