export type AdminCursor = {
  createdAt: Date;
  id: string;
};

export type AdminPagination = {
  pageSize: number;
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
};

export function encodeAdminCursor(item: {
  createdAt: Date;
  id: string;
}): string {
  return Buffer.from(
    JSON.stringify({ t: item.createdAt.toISOString(), i: item.id }),
  ).toString('base64url');
}

export function decodeAdminCursor(
  value: string | undefined,
): AdminCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as { t?: unknown; i?: unknown };
    if (typeof parsed.t !== 'string' || typeof parsed.i !== 'string')
      return null;
    const createdAt = new Date(parsed.t);
    if (Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id: parsed.i };
  } catch {
    return null;
  }
}

export function buildAdminCursorWhere(cursor: AdminCursor | null) {
  if (!cursor) return {};
  return {
    OR: [
      { createdAt: { lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { lt: cursor.id } },
    ],
  };
}

export function parsePageSize(value: string | undefined, fallback = 25) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 100);
}
