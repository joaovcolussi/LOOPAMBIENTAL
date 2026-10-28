import { describe, expect, it } from 'vitest';
import {
  currencyInputToDecimal,
  formatCurrencyInput,
  formatMoney,
  formatDateOnly,
  formatFileSize,
  formatQuantity,
  isDateOnlyExpired,
} from './format';

describe('format', () => {
  it('formats money in Brazilian currency', () => {
    const formatted = formatMoney('1234.5');
    expect(formatted).toContain('1.234,50');
    expect(formatted).toContain('R$');
  });

  it('formats quantities with up to three decimals', () => {
    expect(formatQuantity('1234.5')).toContain('1.234,5');
  });

  it('formats currency input consistently', () => {
    expect(formatCurrencyInput('1234.5')).toContain('1.234,50');
    expect(formatCurrencyInput('')).toBe('');
  });

  it('converts a masked input back to decimal', () => {
    expect(currencyInputToDecimal('1.234,50')).toBe('1234.50');
    expect(currencyInputToDecimal('')).toBe('');
  });

  it('formats file sizes for report listings', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2 KB');
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1,5 MB');
  });

  it('formats date-only values without timezone drift', () => {
    expect(formatDateOnly('2027-01-31T00:00:00.000Z')).toBe('31/01/2027');
    expect(formatDateOnly('2027-01-31')).toBe('31/01/2027');
  });

  it('detects expired report validity by calendar day', () => {
    const today = new Date(2027, 0, 31, 23, 0);
    expect(isDateOnlyExpired('2027-01-30', today)).toBe(true);
    expect(isDateOnlyExpired('2027-01-31T00:00:00.000Z', today)).toBe(false);
  });
});
