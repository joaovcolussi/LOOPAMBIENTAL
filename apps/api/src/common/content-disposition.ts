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
