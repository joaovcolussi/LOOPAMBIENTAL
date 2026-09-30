import { describe, expect, it } from 'vitest';
import {
  currencyInputToDecimal,
  formatCurrencyInput,
  formatMoney,
  formatQuantity,
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
});
