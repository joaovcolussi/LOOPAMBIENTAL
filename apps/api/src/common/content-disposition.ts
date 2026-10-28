import { StreamableFile } from '@nestjs/common';
import type { Response } from 'express';

/**
 * Builds an RFC 6266 `attachment` header that keeps accented file names
 * readable (filename*) while offering a safe ASCII fallback (filename).
 */
export function attachmentDisposition(fileName: string) {
  const fallback =
    fileName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7e]/g, '_')
      .replace(/["\\]/g, '_')
      .trim() || 'arquivo';
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

/**
 * Serves a private file as a download that the browser never renders inline:
 * attachment disposition, no MIME sniffing, sandboxed CSP and no caching.
 */
export function privateDownload(
  response: Response,
  file: { buffer: Buffer; mimeType: string; fileName: string },
) {
  response.setHeader(
    'Content-Disposition',
    attachmentDisposition(file.fileName),
  );
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Security-Policy', "sandbox; default-src 'none'");
  return new StreamableFile(file.buffer, { type: file.mimeType });
}
