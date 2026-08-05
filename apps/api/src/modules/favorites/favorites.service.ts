import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async add(userId: string, listingId: string) {
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, status: 'PUBLISHED', deletedAt: null },
    });
    if (!listing) throw new NotFoundException('LISTING_NOT_FOUND');
    await this.prisma.favorite.upsert({
      where: { userId_listingId: { userId, listingId } },
      update: {},
      create: { userId, listingId },
    });
    return { listingId, favorited: true };
  }

  async remove(userId: string, listingId: string) {
    await this.prisma.favorite.deleteMany({ where: { userId, listingId } });
    return { listingId, favorited: false };
  }

  async list(userId: string): Promise<unknown> {
    return this.prisma.favorite.findMany({
      where: { userId, listing: { deletedAt: null } },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        listing: {
          select: {
            id: true,
            slug: true,
            title: true,
            type: true,
            status: true,
            city: true,
            state: true,
            quantity: true,
            unit: true,
            unitPrice: true,
            currency: true,
            company: {
              select: { legalName: true, tradeName: true, verification: true },
            },
            category: { select: { name: true, slug: true } },
          },
        },
      },
    });
  }
}
