import {
  base32Decode,
  base32Encode,
  generateTotpSecret,
  totpCode,
  verifyTotp,
} from '../src/common/totp';

describe('TOTP', () => {
  // RFC 6238 appendix B test secret ("12345678901234567890").
  const secret = base32Encode(Buffer.from('12345678901234567890'));

  it('matches the RFC 6238 reference vectors (SHA-1, 6 digits)', () => {
    expect(totpCode(secret, 59_000)).toBe('287082');
    expect(totpCode(secret, 1_111_111_109_000)).toBe('081804');
    expect(totpCode(secret, 1_234_567_890_000)).toBe('005924');
  });

  it('round-trips base32', () => {
    const value = generateTotpSecret();
    expect(base32Encode(base32Decode(value))).toBe(value);
  });

  it('accepts one step of drift and rejects malformed codes', () => {
    const now = 1_234_567_890_000;
    expect(verifyTotp(secret, totpCode(secret, now - 30_000), now)).toBe(true);
    expect(verifyTotp(secret, totpCode(secret, now - 90_000), now)).toBe(false);
    expect(verifyTotp(secret, '12ab56', now)).toBe(false);
  });
});
