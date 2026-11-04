import { constants as zlibConstants, inflateSync } from 'node:zlib';

export type ScanVerdict = {
  clean: boolean;
  engine: string;
  signature?: string;
};

/** Adapter boundary for malware scanning (ClamAV, a cloud AV, etc.). */
export interface AntivirusProvider {
  readonly name: string;
  scan(buffer: Buffer): Promise<ScanVerdict>;
}

// Industry-standard harmless test string used to validate antivirus setups.
const EICAR =
  'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!H+H*';

const ACTIVE_PDF_NAMES = new Set([
  'JavaScript',
  'JS',
  'Launch',
  'EmbeddedFile',
]);
// PDF names end at whitespace (NUL included) or a delimiter. A single negated
// class keeps every pattern here linear in the input size.
const PDF_NAME = /\/([^\x00\t\n\f\r /[\]<>(){}%]*)/g;
const STREAM_START = />>[\x00\t\n\f\r ]*stream(?:\r\n|\n|\r)/g;
const MAX_INFLATED_BYTES = 32 * 1024 * 1024;

function pdfNames(text: string): string[] {
  return Array.from(text.matchAll(PDF_NAME), (match) =>
    match[1].replace(/#([0-9a-fA-F]{2})/g, (_, hex: string) =>
      String.fromCharCode(parseInt(hex, 16)),
    ),
  );
}

function hasActiveName(text: string) {
  return pdfNames(text).some((name) => ACTIVE_PDF_NAMES.has(name));
}

/**
 * Looks for active-content names in the PDF object syntax only. Stream data
 * (compressed pages, images) is skipped, because random bytes there would
 * otherwise match; object streams are inflated, since they hold dictionaries.
 */
function pdfHasActiveContent(text: string, raw: Buffer) {
  const streamStart = new RegExp(STREAM_START);
  let budget = MAX_INFLATED_BYTES;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = streamStart.exec(text))) {
    const dataStart = match.index + match[0].length;
    if (hasActiveName(text.slice(cursor, dataStart))) return true;
    const end = text.indexOf('endstream', dataStart);
    const dataEnd = end === -1 ? text.length : end;
    // The stream's own dictionary follows its "N G obj" header.
    const before = text.slice(
      Math.max(cursor, match.index - 2048),
      match.index,
    );
    const dictionary = pdfNames(before.slice(before.lastIndexOf('obj') + 1));
    if (dictionary.includes('ObjStm')) {
      const data = raw.subarray(dataStart, dataEnd);
      if (!dictionary.includes('Filter')) {
        if (hasActiveName(data.toString('latin1'))) return true;
      } else {
        try {
          const inflated = inflateSync(data, {
            finishFlush: zlibConstants.Z_SYNC_FLUSH,
            maxOutputLength: budget,
          });
          budget -= inflated.length;
          if (hasActiveName(inflated.toString('latin1'))) return true;
        } catch {
          // An object stream that cannot be decoded cannot be vouched for.
          return true;
        }
      }
    }
    cursor = dataEnd;
    streamStart.lastIndex = dataEnd;
  }
  return hasActiveName(text.slice(cursor));
}

const SIGNATURES: {
  name: string;
  test: (text: string, raw: Buffer) => boolean;
}[] = [
  { name: 'EICAR-Test-File', test: (text) => text.includes(EICAR) },
  {
    name: 'Embedded-Executable',
    test: (_text, raw) =>
      raw.subarray(0, 2).toString('latin1') === 'MZ' ||
      raw.subarray(0, 4).toString('latin1') === '\x7fELF',
  },
  {
    // Active content inside PDFs is a common malware vector and is never
    // needed for technical reports.
    name: 'PDF-Active-Content',
    test: (text, raw) =>
      text.startsWith('%PDF-') && pdfHasActiveContent(text, raw),
  },
];

/**
 * Lightweight signature scanner used by the demo environment. It blocks the
 * EICAR test file, executables and PDFs with active content. Production
 * should plug a real engine behind the same interface.
 */
export class SignatureScanner implements AntivirusProvider {
  readonly name = 'loop-signature-scanner';

  scan(buffer: Buffer): Promise<ScanVerdict> {
    const text = buffer.toString('latin1');
    const hit = SIGNATURES.find((signature) => signature.test(text, buffer));
    return Promise.resolve(
      hit
        ? { clean: false, engine: this.name, signature: hit.name }
        : { clean: true, engine: this.name },
    );
  }
}

export function createAntivirusProvider(): AntivirusProvider {
  return new SignatureScanner();
}
