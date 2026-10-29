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
    test: (text) =>
      text.startsWith('%PDF-') &&
      /\/(JavaScript|JS|Launch|EmbeddedFile|OpenAction\s*<<[^>]*\/JS)\b/.test(
        text,
      ),
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
