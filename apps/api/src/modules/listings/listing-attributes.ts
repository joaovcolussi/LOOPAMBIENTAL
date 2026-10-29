import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@loopambiental/database';

export type AttributeDefinition = {
  id: string;
  type: 'TEXT' | 'NUMBER' | 'SELECT' | 'BOOLEAN';
  options: unknown;
};

export type AttributeValueInput = { attributeId: string; value: string };

export type NormalizedAttribute = {
  attributeId: string;
  valueText: string | null;
  valueNumber: string | null;
};

export const MAX_LISTING_ATTRIBUTES = 20;

export const listingAttributeSelect = {
  valueText: true,
  valueNumber: true,
  attribute: {
    select: {
      id: true,
      key: true,
      label: true,
      type: true,
      unit: true,
      sortOrder: true,
    },
  },
} as const;

export const materialAttributeSelect = {
  id: true,
  key: true,
  label: true,
  type: true,
  unit: true,
  options: true,
  isFilterable: true,
  sortOrder: true,
} as const;

/** Parses the untrusted `attributes` body field. `undefined` means "unchanged". */
export function parseAttributeInput(
  raw: unknown,
): AttributeValueInput[] | undefined {
  if (raw === undefined) return undefined;
  if (!Array.isArray(raw) || raw.length > MAX_LISTING_ATTRIBUTES)
    throw new BadRequestException('INVALID_LISTING_ATTRIBUTES');
  return raw.map((item) => {
    if (!item || typeof item !== 'object')
      throw new BadRequestException('INVALID_LISTING_ATTRIBUTES');
    const { attributeId, value } = item as Record<string, unknown>;
    if (
      typeof attributeId !== 'string' ||
      (typeof value !== 'string' &&
        typeof value !== 'number' &&
        typeof value !== 'boolean')
    )
      throw new BadRequestException('INVALID_LISTING_ATTRIBUTES');
    return { attributeId, value: String(value).trim() };
  });
}

/**
 * Validates values against the category's attribute catalog. Empty values are
 * dropped so a form can clear an optional attribute.
 */
export function normalizeAttributes(
  definitions: AttributeDefinition[],
  values: AttributeValueInput[],
): NormalizedAttribute[] {
  const byId = new Map(definitions.map((item) => [item.id, item]));
  const seen = new Set<string>();
  const rows: NormalizedAttribute[] = [];
  for (const { attributeId, value } of values) {
    const definition = byId.get(attributeId);
    if (!definition || seen.has(attributeId))
      throw new BadRequestException('INVALID_LISTING_ATTRIBUTES');
    seen.add(attributeId);
    if (!value) continue;
    if (definition.type === 'NUMBER') {
      const normalized = value.replace(',', '.');
      if (!/^\d{1,13}(\.\d{1,3})?$/.test(normalized))
        throw new BadRequestException('INVALID_ATTRIBUTE_NUMBER');
      rows.push({ attributeId, valueText: null, valueNumber: normalized });
      continue;
    }
    if (definition.type === 'BOOLEAN') {
      if (value !== 'true' && value !== 'false')
        throw new BadRequestException('INVALID_ATTRIBUTE_BOOLEAN');
      rows.push({ attributeId, valueText: value, valueNumber: null });
      continue;
    }
    if (definition.type === 'SELECT') {
      const options = Array.isArray(definition.options)
        ? (definition.options as unknown[]).map(String)
        : [];
      if (!options.includes(value))
        throw new BadRequestException('INVALID_ATTRIBUTE_OPTION');
    }
    rows.push({
      attributeId,
      valueText: value.slice(0, 200),
      valueNumber: null,
    });
  }
  return rows;
}

export async function replaceListingAttributes(
  transaction: Prisma.TransactionClient,
  listingId: string,
  rows: NormalizedAttribute[],
) {
  await transaction.listingAttribute.deleteMany({ where: { listingId } });
  if (rows.length)
    await transaction.listingAttribute.createMany({
      data: rows.map((row) => ({ listingId, ...row })),
    });
}
