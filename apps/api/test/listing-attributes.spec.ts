import {
  normalizeAttributes,
  parseAttributeInput,
} from '../src/modules/listings/listing-attributes';
import { normalizeListingSearchFilters } from '../src/modules/listings/listing-search.service';

const definitions = [
  { id: 'polymer', type: 'SELECT' as const, options: ['PET', 'PEAD'] },
  { id: 'purity', type: 'NUMBER' as const, options: null },
  { id: 'treated', type: 'BOOLEAN' as const, options: null },
  { id: 'notes', type: 'TEXT' as const, options: null },
];

describe('listing attributes', () => {
  it('normalizes valid values and drops empty ones', () => {
    expect(
      normalizeAttributes(definitions, [
        { attributeId: 'polymer', value: 'PET' },
        { attributeId: 'purity', value: '98,5' },
        { attributeId: 'treated', value: 'false' },
        { attributeId: 'notes', value: '' },
      ]),
    ).toEqual([
      { attributeId: 'polymer', valueText: 'PET', valueNumber: null },
      { attributeId: 'purity', valueText: null, valueNumber: '98.5' },
      { attributeId: 'treated', valueText: 'false', valueNumber: null },
    ]);
  });

  it.each([
    [{ attributeId: 'polymer', value: 'PVC' }, 'INVALID_ATTRIBUTE_OPTION'],
    [{ attributeId: 'purity', value: 'muito' }, 'INVALID_ATTRIBUTE_NUMBER'],
    [{ attributeId: 'treated', value: 'sim' }, 'INVALID_ATTRIBUTE_BOOLEAN'],
    [
      { attributeId: 'other-category', value: 'x' },
      'INVALID_LISTING_ATTRIBUTES',
    ],
  ])('rejects %p', (input, code) => {
    expect(() => normalizeAttributes(definitions, [input])).toThrow(code);
  });

  it('rejects duplicated attributes and malformed payloads', () => {
    expect(() =>
      normalizeAttributes(definitions, [
        { attributeId: 'polymer', value: 'PET' },
        { attributeId: 'polymer', value: 'PEAD' },
      ]),
    ).toThrow('INVALID_LISTING_ATTRIBUTES');
    expect(() => parseAttributeInput('PET')).toThrow(
      'INVALID_LISTING_ATTRIBUTES',
    );
    expect(parseAttributeInput(undefined)).toBeUndefined();
    expect(parseAttributeInput([{ attributeId: 'a', value: 5 }])).toEqual([
      { attributeId: 'a', value: '5' },
    ]);
  });

  it('parses attribute search filters with a limit', () => {
    const filters = normalizeListingSearchFilters({
      attr: ['polymer:PET', 'bad', ':x', 'a:1', 'b:2', 'c:3', 'd:4', 'e:5'],
    });
    expect(filters.attributes).toEqual([
      { attributeId: 'polymer', value: 'PET' },
      { attributeId: 'a', value: '1' },
      { attributeId: 'b', value: '2' },
    ]);
  });
});
