import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';

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
