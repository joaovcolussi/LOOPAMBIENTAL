import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@loopambiental/database';
import { PrismaService } from '../../infrastructure/prisma.service';
import { boundingBox, Coordinates } from '../../common/geo';
import { publicListingCardSelect } from './public-listing-select';

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 12;
const MAX_RADIUS_KM = 2000;

export type ListingSearchSort = 'recent' | 'relevance' | 'distance';

export type ListingSearchFilters = {
  q?: string;
  type?: 'BUY' | 'SELL';
  categoryId?: string;
  state?: string;
  city?: string;
  verified?: boolean;
  minPrice?: string;
  maxPrice?: string;
  near?: Coordinates;
  radiusKm?: number;
  sort: ListingSearchSort;
};

type ListingCursor = {
  rank: number;
  publishedAt: string | null;
  id: string;
  distanceKey?: number | null;
};

type SearchRow = {
  id: string;
  score: number | string | null;
  rank_value: number | string | bigint | null;
  published_at: Date | null;
  distance_km?: number | string | null;
  distance_key?: number | string | bigint | null;
};

type CountRow = { total: bigint | number };

type CategoryFacetRow = {
  id: string;
  name: string;
  slug: string;
  total: bigint | number;
};

type ValueFacetRow = { value: string | null; total: bigint | number };

function toNumber(value: bigint | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

export function normalizeListingSearchFilters(input: {
  q?: unknown;
  type?: unknown;
  categoryId?: unknown;
  state?: unknown;
  city?: unknown;
  verified?: unknown;
  minPrice?: unknown;
  maxPrice?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  radiusKm?: unknown;
  sort?: unknown;
}): ListingSearchFilters {
  const q = typeof input.q === 'string' ? input.q.trim().slice(0, 120) : '';
  const type =
    input.type === 'BUY' || input.type === 'SELL' ? input.type : undefined;
  const categoryId =
    typeof input.categoryId === 'string' && input.categoryId.trim()
      ? input.categoryId.trim().slice(0, 36)
      : undefined;
  const state =
    typeof input.state === 'string' && input.state.trim()
      ? input.state.trim().toUpperCase().slice(0, 2)
      : undefined;
  const city =
    typeof input.city === 'string' && input.city.trim()
      ? input.city.trim().slice(0, 120)
      : undefined;
  const verified = input.verified === true || input.verified === 'true';
  const minPrice = normalizeDecimal(input.minPrice);
  const maxPrice = normalizeDecimal(input.maxPrice);
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  const near =
    isValidLatitude(latitude) && isValidLongitude(longitude)
      ? { latitude, longitude }
      : undefined;
  const radiusValue = Number(input.radiusKm);
  const radiusKm =
    near && Number.isFinite(radiusValue) && radiusValue > 0
      ? Math.min(Math.round(radiusValue), MAX_RADIUS_KM)
      : near
        ? 50
        : undefined;
  const requestedSort =
    input.sort === 'recent' ||
    input.sort === 'relevance' ||
    input.sort === 'distance'
      ? input.sort
      : undefined;
  const sort: ListingSearchSort =
    requestedSort === 'recent'
      ? 'recent'
      : requestedSort === 'distance' && near
        ? 'distance'
        : q
          ? 'relevance'
          : 'recent';
  return {
    ...(q ? { q } : {}),
    ...(type ? { type } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(state ? { state } : {}),
    ...(city ? { city } : {}),
    ...(verified ? { verified } : {}),
    ...(minPrice ? { minPrice } : {}),
    ...(maxPrice ? { maxPrice } : {}),
    ...(near ? { near } : {}),
    ...(radiusKm ? { radiusKm } : {}),
    sort,
  };
}

function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function normalizeDecimal(value: unknown): string | undefined {
  const raw =
    typeof value === 'string' || typeof value === 'number'
      ? String(value).trim()
      : '';
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(raw)) return undefined;
  return raw;
}

function decodeCursor(value: string): ListingCursor | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as Partial<ListingCursor>;
    if (typeof parsed.id !== 'string' || typeof parsed.rank !== 'number')
      return null;
    return {
      rank: parsed.rank,
      publishedAt:
        typeof parsed.publishedAt === 'string' ? parsed.publishedAt : null,
      id: parsed.id,
      distanceKey:
        typeof parsed.distanceKey === 'number' ? parsed.distanceKey : null,
    };
  } catch {
    return null;
  }
}

function encodeCursor(row: SearchRow): string {
  const cursor: ListingCursor = {
    rank: toNumber(row.rank_value),
    publishedAt: row.published_at ? row.published_at.toISOString() : null,
    id: row.id,
    distanceKey: toNumber(row.distance_key),
  };
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

function buildWhereSql(filters: ListingSearchFilters): Prisma.Sql {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`l.status = 'PUBLISHED'`,
    Prisma.sql`l.deleted_at IS NULL`,
  ];
  if (filters.type) conditions.push(Prisma.sql`l.type = ${filters.type}`);
  if (filters.categoryId)
    conditions.push(Prisma.sql`l.category_id = ${filters.categoryId}`);
  if (filters.state) conditions.push(Prisma.sql`l.state = ${filters.state}`);
  if (filters.city)
    conditions.push(Prisma.sql`l.city LIKE ${`%${filters.city}%`}`);
  if (filters.verified)
    conditions.push(Prisma.sql`c.verification = 'VERIFIED'`);
  if (filters.minPrice)
    conditions.push(Prisma.sql`l.unit_price >= ${filters.minPrice}`);
  if (filters.maxPrice)
    conditions.push(Prisma.sql`l.unit_price <= ${filters.maxPrice}`);
  if (filters.q)
    conditions.push(
      Prisma.sql`MATCH(l.title, l.description) AGAINST (${filters.q} IN NATURAL LANGUAGE MODE)`,
    );
  if (filters.near && filters.radiusKm) {
    const box = boundingBox(filters.near, filters.radiusKm);
    conditions.push(Prisma.sql`l.latitude IS NOT NULL`);
    conditions.push(Prisma.sql`l.longitude IS NOT NULL`);
    conditions.push(
      Prisma.sql`l.latitude BETWEEN ${box.minLat} AND ${box.maxLat}`,
    );
    conditions.push(
      Prisma.sql`l.longitude BETWEEN ${box.minLng} AND ${box.maxLng}`,
    );
    conditions.push(
      Prisma.sql`ST_Distance_Sphere(POINT(l.longitude, l.latitude), POINT(${filters.near.longitude}, ${filters.near.latitude})) <= ${filters.radiusKm * 1000}`,
    );
  }
  return Prisma.join(conditions, ' AND ');
}

function buildRelevanceSql(filters: ListingSearchFilters): Prisma.Sql {
  if (!filters.q) return Prisma.sql`0`;
  return Prisma.sql`MATCH(l.title, l.description) AGAINST (${filters.q} IN NATURAL LANGUAGE MODE)`;
}

function buildDistanceSql(filters: ListingSearchFilters): Prisma.Sql {
  if (!filters.near) return Prisma.sql`NULL`;
  return Prisma.sql`ST_Distance_Sphere(POINT(l.longitude, l.latitude), POINT(${filters.near.longitude}, ${filters.near.latitude})) / 1000`;
}

@Injectable()
export class ListingSearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(params: {
    filters: ListingSearchFilters;
    cursor?: string;
    page?: number;
    pageSize?: number;
  }) {
    const filters = params.filters;
    const pageSize = Math.min(
      Math.max(1, Math.floor(params.pageSize || DEFAULT_PAGE_SIZE)),
      MAX_PAGE_SIZE,
    );
    const where = buildWhereSql(filters);
    const score = buildRelevanceSql(filters);
    const distance = buildDistanceSql(filters);
    const orderBy =
      filters.sort === 'distance' && filters.near
        ? Prisma.sql`distance_key ASC, l.published_at DESC, l.id DESC`
        : Prisma.sql`rank_value DESC, l.published_at DESC, l.id DESC`;
    // Relevance and distance are floats; equality in a keyset cursor must rely
    // on an integer bucket so the comparison stays stable across parameter
    // binding. Distances are bucketed in meters.
    const rankSql = Prisma.sql`CAST(ROUND(${score} * 10000) AS UNSIGNED)`;
    const distanceKeySql = Prisma.sql`CAST(ROUND(${distance} * 1000) AS UNSIGNED)`;
    const cursor = params.cursor ? decodeCursor(params.cursor) : null;
    if (params.cursor && !cursor)
      throw new BadRequestException('INVALID_SEARCH_CURSOR');
    const useDistanceCursor =
      Boolean(filters.sort === 'distance' && filters.near && cursor) &&
      cursor !== null &&
      cursor.distanceKey !== null &&
      cursor.distanceKey !== undefined;

    const useOffset =
      !cursor && typeof params.page === 'number' && params.page > 1;
    const offset = useOffset ? ((params.page as number) - 1) * pageSize : 0;

    let cursorClause = Prisma.empty;
    if (cursor && useDistanceCursor) {
      const distanceKey = cursor.distanceKey as number;
      if (cursor.publishedAt) {
        const publishedAt = new Date(cursor.publishedAt);
        cursorClause = Prisma.sql`AND (
          ${distanceKeySql} > ${distanceKey}
          OR (${distanceKeySql} = ${distanceKey} AND l.published_at < ${publishedAt})
          OR (${distanceKeySql} = ${distanceKey} AND l.published_at = ${publishedAt} AND l.id < ${cursor.id})
        )`;
      } else {
        cursorClause = Prisma.sql`AND (
          ${distanceKeySql} > ${distanceKey}
          OR (${distanceKeySql} = ${distanceKey} AND l.published_at IS NULL AND l.id < ${cursor.id})
        )`;
      }
    } else if (cursor) {
      if (cursor.publishedAt) {
        const publishedAt = new Date(cursor.publishedAt);
        cursorClause = Prisma.sql`AND (
          ${rankSql} < ${cursor.rank}
          OR (${rankSql} = ${cursor.rank} AND l.published_at < ${publishedAt})
          OR (${rankSql} = ${cursor.rank} AND l.published_at = ${publishedAt} AND l.id < ${cursor.id})
        )`;
      } else {
        cursorClause = Prisma.sql`AND (
          ${rankSql} < ${cursor.rank}
          OR (${rankSql} = ${cursor.rank} AND l.published_at IS NULL AND l.id < ${cursor.id})
        )`;
      }
    }

    const [rows, totalRows, categoryRows, typeRows, stateRows] =
      await Promise.all([
        this.prisma.$queryRaw<SearchRow[]>(Prisma.sql`
          SELECT l.id AS id, ${score} AS score, ${rankSql} AS rank_value,
                 ${distance} AS distance_km,
                 ${distanceKeySql} AS distance_key,
                 l.published_at AS published_at
          FROM listings l
          JOIN companies c ON c.id = l.company_id
          WHERE ${where} ${cursorClause}
          ORDER BY ${orderBy}
          LIMIT ${pageSize + 1} OFFSET ${offset}
        `),
        this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
          SELECT COUNT(*) AS total
          FROM listings l
          JOIN companies c ON c.id = l.company_id
          WHERE ${where}
        `),
        this.prisma.$queryRaw<CategoryFacetRow[]>(Prisma.sql`
          SELECT l.category_id AS id, wc.name AS name, wc.slug AS slug, COUNT(*) AS total
          FROM listings l
          JOIN companies c ON c.id = l.company_id
          JOIN waste_categories wc ON wc.id = l.category_id
          WHERE ${where}
          GROUP BY l.category_id, wc.name, wc.slug
          ORDER BY total DESC
          LIMIT 50
        `),
        this.prisma.$queryRaw<ValueFacetRow[]>(Prisma.sql`
          SELECT l.type AS value, COUNT(*) AS total
          FROM listings l
          JOIN companies c ON c.id = l.company_id
          WHERE ${where}
          GROUP BY l.type
          ORDER BY total DESC
        `),
        this.prisma.$queryRaw<ValueFacetRow[]>(Prisma.sql`
          SELECT l.state AS value, COUNT(*) AS total
          FROM listings l
          JOIN companies c ON c.id = l.company_id
          WHERE ${where} AND l.state IS NOT NULL
          GROUP BY l.state
          ORDER BY total DESC
          LIMIT 27
        `),
      ]);

    const hasMore = rows.length > pageSize;
    const visible = hasMore ? rows.slice(0, pageSize) : rows;
    const ids = visible.map((row) => row.id);
    const items = ids.length
      ? await this.prisma.listing.findMany({
          where: { id: { in: ids } },
          select: publicListingCardSelect,
        })
      : [];
    const byId = new Map(items.map((item) => [item.id, item]));
    const data = visible
      .map((row) => {
        const item = byId.get(row.id);
        if (!item) return null;
        const distanceKm =
          row.distance_km === null || row.distance_km === undefined
            ? null
            : toNumber(row.distance_km);
        return {
          ...item,
          score: toNumber(row.score),
          distanceKm:
            distanceKm === null ? null : Math.round(distanceKm * 10) / 10,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (ids.length) {
      const lastAccessAt = new Date();
      await this.prisma.listing.updateMany({
        where: { id: { in: ids } },
        data: { lastAccessAt },
      });
    }

    const total = toNumber(totalRows[0]?.total);
    const lastRow = visible[visible.length - 1];
    const page = params.page && params.page > 0 ? Math.floor(params.page) : 1;

    return {
      data,
      sort: filters.sort,
      pagination: {
        pageSize,
        total,
        hasMore,
        nextCursor: hasMore && lastRow ? encodeCursor(lastRow) : null,
        ...(useOffset
          ? { page, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
          : {}),
      },
      facets: {
        categories: categoryRows.map((row) => ({
          id: row.id,
          name: row.name,
          slug: row.slug,
          total: toNumber(row.total),
        })),
        types: typeRows
          .filter((row) => row.value)
          .map((row) => ({
            value: row.value as string,
            total: toNumber(row.total),
          })),
        states: stateRows
          .filter((row) => row.value)
          .map((row) => ({
            value: row.value as string,
            total: toNumber(row.total),
          })),
      },
    };
  }
}
