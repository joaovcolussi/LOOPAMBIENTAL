import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma.service';
import { publicListingCardSelect } from './public-listing-select';

const CANDIDATE_LIMIT = 150;
const RESULT_LIMIT = 12;

type Signals = {
  companyIds: string[];
  states: Set<string>;
  // Category → what the user's companies are likely looking for there.
  wantedTypes: Map<string, Set<'BUY' | 'SELL'>>;
  favoriteCategories: Set<string>;
  searchedCategories: Set<string>;
  favoriteListingIds: Set<string>;
};

/**
 * Rule-based offer recommendations (explainable, no ML): complementary
 * listings to what the company already trades, plus favourite and saved
 * search categories, boosted by region, verification and freshness.
 */
@Injectable()
export class ListingRecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async forUser(userId: string): Promise<unknown> {
    const signals = await this.signals(userId);
    const categoryIds = [
      ...new Set([
        ...signals.wantedTypes.keys(),
        ...signals.favoriteCategories,
        ...signals.searchedCategories,
      ]),
    ];
    const candidates = await this.prisma.listing.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        ...(signals.companyIds.length
          ? { companyId: { notIn: signals.companyIds } }
          : {}),
        ...(categoryIds.length ? { categoryId: { in: categoryIds } } : {}),
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: CANDIDATE_LIMIT,
      select: {
        ...publicListingCardSelect,
        categoryId: true,
        state: true,
        type: true,
        publishedAt: true,
        company: {
          select: {
            id: true,
            slug: true,
            legalName: true,
            tradeName: true,
            verification: true,
          },
        },
      },
    });
    const now = Date.now();
    const scored = candidates
      .filter((listing) => !signals.favoriteListingIds.has(listing.id))
      .map((listing) => {
        let score = 0;
        const reasons: string[] = [];
        const wanted = signals.wantedTypes.get(listing.categoryId);
        if (wanted?.has(listing.type)) {
          score += 4;
          reasons.push(
            listing.type === 'BUY'
              ? 'Demanda de compra para um material que sua empresa anuncia'
              : 'Oferta de um material que sua empresa procura',
          );
        }
        if (signals.favoriteCategories.has(listing.categoryId)) {
          score += 2;
          reasons.push('Categoria dos seus favoritos');
        }
        if (signals.searchedCategories.has(listing.categoryId)) {
          score += 2;
          reasons.push('Corresponde a uma busca salva');
        }
        if (listing.state && signals.states.has(listing.state)) {
          score += 1.5;
          reasons.push('Mesma região da sua empresa');
        }
        if (listing.company.verification === 'VERIFIED') {
          score += 1;
          reasons.push('Empresa verificada');
        }
        const ageDays = listing.publishedAt
          ? (now - listing.publishedAt.getTime()) / 86_400_000
          : 90;
        score += Math.max(0, 1 - ageDays / 60);
        return { listing, score: Math.round(score * 100) / 100, reasons };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, RESULT_LIMIT);
    return {
      basedOn: {
        complementaryCategories: signals.wantedTypes.size,
        favoriteCategories: signals.favoriteCategories.size,
        savedSearchCategories: signals.searchedCategories.size,
      },
      recommendations: scored.map(
        ({
          listing: { categoryId: _c, publishedAt: _p, ...card },
          score,
          reasons,
        }) => ({
          listing: card,
          score,
          reasons: reasons.length ? reasons : ['Oportunidade recente'],
        }),
      ),
    };
  }

  private async signals(userId: string): Promise<Signals> {
    const [memberships, favorites, savedSearches] = await Promise.all([
      this.prisma.companyMember.findMany({
        where: { userId },
        select: {
          company: {
            select: {
              id: true,
              state: true,
              listings: {
                where: { deletedAt: null },
                select: { categoryId: true, type: true },
                take: 200,
              },
            },
          },
        },
      }),
      this.prisma.favorite.findMany({
        where: { userId },
        select: { listingId: true, listing: { select: { categoryId: true } } },
        take: 200,
      }),
      this.prisma.savedSearch.findMany({
        where: { userId, isActive: true },
        select: { filters: true },
        take: 50,
      }),
    ]);
    const wantedTypes = new Map<string, Set<'BUY' | 'SELL'>>();
    const states = new Set<string>();
    for (const { company } of memberships) {
      if (company.state) states.add(company.state);
      for (const listing of company.listings) {
        // A seller is interested in buyers of that material and vice versa.
        const complementary = listing.type === 'SELL' ? 'BUY' : 'SELL';
        const set = wantedTypes.get(listing.categoryId) ?? new Set();
        set.add(complementary);
        wantedTypes.set(listing.categoryId, set);
      }
    }
    const searchedCategories = new Set<string>();
    for (const search of savedSearches) {
      const filters = search.filters as { categoryId?: unknown } | null;
      if (filters && typeof filters.categoryId === 'string')
        searchedCategories.add(filters.categoryId);
    }
    return {
      companyIds: memberships.map((membership) => membership.company.id),
      states,
      wantedTypes,
      favoriteCategories: new Set(
        favorites.map((favorite) => favorite.listing.categoryId),
      ),
      searchedCategories,
      favoriteListingIds: new Set(
        favorites.map((favorite) => favorite.listingId),
      ),
    };
  }
}
