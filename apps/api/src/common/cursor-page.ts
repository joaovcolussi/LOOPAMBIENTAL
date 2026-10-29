export type PageRequest = { cursor?: string; pageSize?: number };

export type PagedResult<T> = {
  items: T[];
  pagination: { pageSize: number; hasMore: boolean; nextCursor: string | null };
};

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

/** Parses `cursor` and `pageSize` query values coming from controllers. */
export function parsePageRequest(
  cursor?: string,
  pageSize?: string,
): PageRequest {
  const size = Number(pageSize);
  return {
    cursor: cursor && /^[0-9a-f-]{36}$/i.test(cursor) ? cursor : undefined,
    pageSize: Number.isInteger(size) && size > 0 ? size : undefined,
  };
}

/**
 * Prisma keyset arguments over a unique `id` cursor. Callers must order by a
 * deterministic key ending in `id` so pages never overlap.
 */
export function cursorArgs(page: PageRequest | undefined) {
  const pageSize = Math.min(
    Math.max(page?.pageSize ?? DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  );
  return {
    pageSize,
    args: {
      take: pageSize + 1,
      ...(page?.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
    },
  };
}

export function toPage<T extends { id: string }>(
  rows: T[],
  pageSize: number,
): PagedResult<T> {
  const hasMore = rows.length > pageSize;
  const items = hasMore ? rows.slice(0, pageSize) : rows;
  return {
    items,
    pagination: {
      pageSize,
      hasMore,
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    },
  };
}
