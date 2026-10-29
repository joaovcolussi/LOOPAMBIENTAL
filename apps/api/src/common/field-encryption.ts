import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';

function fieldKey(): string {
  const configured = process.env.FIELD_ENCRYPTION_KEY;
  if (!configured) {
    if (process.env.NODE_ENV === 'production')
      throw new Error('FIELD_ENCRYPTION_KEY_REQUIRED');
    return 'loop-local-field-key';
  }
  return configured;
}

/** AES-256-GCM envelope used for sensitive columns (CNPJ, MFA secrets). */
export function encryptField(value: string) {
  const key = createHash('sha256').update(fieldKey()).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value), cipher.final()]);
  return `v1:${iv.toString('base64url')}:${cipher.getAuthTag().toString('base64url')}:${encrypted.toString('base64url')}`;
}

export function decryptField(value: string): string | null {
  try {
    const [, ivB64, tagB64, dataB64] = value.split(':');
    if (!ivB64 || !tagB64 || !dataB64) return null;
    const key = createHash('sha256').update(fieldKey()).digest();
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivB64, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64url')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}
