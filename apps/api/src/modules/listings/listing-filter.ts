export type ListingFilters = {
  q?: string;
  type?: 'BUY' | 'SELL';
  categoryId?: string;
  state?: string;
};

export function normalizeListingFilters(input: {
  q?: unknown;
  type?: unknown;
  categoryId?: unknown;
  state?: unknown;
}): ListingFilters {
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
  return {
    ...(q ? { q } : {}),
    ...(type ? { type } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(state ? { state } : {}),
  };
}

export function buildPublishedListingWhere(filters: ListingFilters) {
  return {
    status: 'PUBLISHED' as const,
    deletedAt: null,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.state ? { state: filters.state } : {}),
    ...(filters.q
      ? {
          OR: [
            { title: { contains: filters.q } },
            { description: { contains: filters.q } },
            { city: { contains: filters.q } },
          ],
        }
      : {}),
  };
}
