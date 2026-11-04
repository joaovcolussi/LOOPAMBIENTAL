import { deflateSync } from 'node:zlib';
import { SignatureScanner } from '../src/infrastructure/file-scanner';
import { MetricsService } from '../src/infrastructure/observability/metrics.service';
import { redact } from '../src/infrastructure/observability/json-logger';

describe('SignatureScanner', () => {
  const scanner = new SignatureScanner();
  const eicar =
    'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!H+H*';

  it('flags the EICAR test file', async () => {
    await expect(scanner.scan(Buffer.from(eicar))).resolves.toMatchObject({
      clean: false,
      signature: 'EICAR-Test-File',
    });
  });

  it('flags executables and PDFs with active content', async () => {
    await expect(
      scanner.scan(Buffer.from('MZ\x90\x00binary')),
    ).resolves.toMatchObject({ clean: false });
    await expect(
      scanner.scan(
        Buffer.from(
          '%PDF-1.7\n1 0 obj << /OpenAction 2 0 R /JS (app.alert(1)) >>',
        ),
      ),
    ).resolves.toMatchObject({ clean: false, signature: 'PDF-Active-Content' });
  });

  it('accepts a plain PDF', async () => {
    await expect(
      scanner.scan(Buffer.from('%PDF-1.7\n1 0 obj << /Type /Catalog >>')),
    ).resolves.toMatchObject({ clean: true });
  });

  it('scans adversarial input in linear time', async () => {
    const started = Date.now();
    await expect(
      scanner.scan(Buffer.from(`%PDF-${'/OpenAction<<'.repeat(200_000)}`)),
    ).resolves.toMatchObject({ clean: true });
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('ignores name-like bytes inside stream data', async () => {
    const pdf = Buffer.concat([
      Buffer.from(
        '%PDF-1.7\n4 0 obj << /Length 8 /Filter /FlateDecode >>\nstream\n',
      ),
      // "/JS " by chance inside compressed bytes.
      Buffer.from([0x9c, 0x2f, 0x4a, 0x53, 0x20, 0x07, 0x2f, 0x4a]),
      Buffer.from('\nendstream\nendobj\n'),
    ]);
    await expect(scanner.scan(pdf)).resolves.toMatchObject({ clean: true });
  });

  it('decodes hex-escaped names and inflates object streams', async () => {
    await expect(
      scanner.scan(
        Buffer.from('%PDF-1.7\n1 0 obj << /OpenAction << /S /J#53 (x) >> >>'),
      ),
    ).resolves.toMatchObject({ clean: false, signature: 'PDF-Active-Content' });
    const objects = deflateSync(
      Buffer.from('<< /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >>'),
    );
    const pdf = Buffer.concat([
      Buffer.from(
        `%PDF-1.7\n5 0 obj << /Type /ObjStm /N 1 /First 4 /Filter /FlateDecode /Length ${objects.length} >>\nstream\n`,
      ),
      objects,
      Buffer.from('\nendstream\nendobj\n'),
    ]);
    await expect(scanner.scan(pdf)).resolves.toMatchObject({
      clean: false,
      signature: 'PDF-Active-Content',
    });
  });
});

describe('MetricsService', () => {
  it('aggregates requests and renders Prometheus text', () => {
    const metrics = new MetricsService();
    metrics.recordRequest('GET', '/api/v1/listings', 200, 0.04);
    metrics.recordRequest('GET', '/api/v1/listings', 500, 0.3);
    const snapshot = metrics.snapshot();
    expect(snapshot.totalRequests).toBe(2);
    expect(snapshot.totalErrors).toBe(1);
    const text = metrics.prometheus();
    expect(text).toContain(
      'http_requests_total{method="GET",route="/api/v1/listings",status="500"} 1',
    );
    expect(text).toContain(
      'http_request_duration_seconds_bucket{method="GET",route="/api/v1/listings",le="0.05"} 1',
    );
  });
});

describe('log redaction', () => {
  it('masks sensitive keys at any depth', () => {
    expect(
      redact({
        user: 'a',
        password: 'x',
        nested: { authorization: 'Bearer y' },
      }),
    ).toEqual({
      user: 'a',
      password: '[REDACTED]',
      nested: { authorization: '[REDACTED]' },
    });
  });
});
