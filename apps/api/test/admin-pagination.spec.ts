import {
  buildAdminCursorWhere,
  decodeAdminCursor,
  encodeAdminCursor,
  parsePageSize,
} from '../src/modules/admin/admin-pagination';

describe('admin pagination', () => {
  const createdAt = new Date('2026-05-01T10:00:00.000Z');

  it('round-trips a cursor', () => {
    const encoded = encodeAdminCursor({ createdAt, id: 'user-id' });
    expect(decodeAdminCursor(encoded)).toEqual({ createdAt, id: 'user-id' });
  });

  it('returns null for malformed cursors', () => {
    expect(decodeAdminCursor('not-base64-json')).toBeNull();
    expect(decodeAdminCursor(undefined)).toBeNull();
  });

  it('builds a stable keyset filter', () => {
    expect(buildAdminCursorWhere({ createdAt, id: 'user-id' })).toEqual({
      OR: [
        { createdAt: { lt: createdAt } },
        { createdAt, id: { lt: 'user-id' } },
      ],
    });
    expect(buildAdminCursorWhere(null)).toEqual({});
  });

  it('clamps the page size', () => {
    expect(parsePageSize(undefined)).toBe(25);
    expect(parsePageSize('5')).toBe(5);
    expect(parsePageSize('1000')).toBe(100);
    expect(parsePageSize('-3')).toBe(25);
  });
});
