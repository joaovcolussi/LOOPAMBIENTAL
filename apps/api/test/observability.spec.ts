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
