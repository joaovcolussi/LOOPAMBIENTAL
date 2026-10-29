import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import { publicListingCardSelect } from '../listings/public-listing-select';
import { materialAttributeSelect } from '../listings/listing-attributes';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  async list() {
    return {
      categories: await this.prisma.wasteCategory.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, slug: true },
      }),
    };
  }

  // Technical attributes configured for a category (form fields and filters).
  @Get(':id/attributes')
  async attributes(@Param('id') id: string): Promise<unknown> {
    return {
      attributes: await this.prisma.materialAttribute.findMany({
        where: { OR: [{ categoryId: id }, { category: { slug: id } }] },
        orderBy: { sortOrder: 'asc' },
        select: materialAttributeSelect,
      }),
    };
  }

  @Get(':slug')
  async find(@Param('slug') slug: string): Promise<unknown> {
    const category = await this.prisma.wasteCategory.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true },
    });
    if (!category) throw new NotFoundException('CATEGORY_NOT_FOUND');
    const listings = await this.prisma.listing.findMany({
      where: { categoryId: category.id, status: 'PUBLISHED', deletedAt: null },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: 24,
      select: publicListingCardSelect,
    });
    return { category, listings };
  }
}

@Controller('materials')
export class MaterialsController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  async list(@Query('categoryId') categoryId?: string) {
    return {
      materials: await this.prisma.material.findMany({
        where: categoryId ? { categoryId } : undefined,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          categoryId: true,
          defaultUnit: true,
        },
      }),
    };
  }
}
