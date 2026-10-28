import { APIRequestContext, expect, test } from '@playwright/test';
import {
  API_URL,
  createListing,
  firstCategoryId,
  registerAccount,
} from './support/fixtures';

const ORIGIN = process.env.E2E_WEB_ORIGIN ?? 'http://localhost:3000';
const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n',
  'latin1',
);

async function sessionCookie(
  request: APIRequestContext,
  account: { email: string; password: string },
) {
  const login = await request.post(`${API_URL}/auth/login`, {
    headers: { Origin: ORIGIN },
    data: { email: account.email, password: account.password },
  });
  const token =
    /loopambiental_session=([^;]+)/.exec(
      login.headers()['set-cookie'] ?? '',
    )?.[1] ?? '';
  return `loopambiental_session=${token}`;
}

test.describe('laudos em anúncios', () => {
  for (const type of ['SELL', 'BUY'] as const) {
    test(`anexa, baixa e remove laudo em anúncio de ${type === 'SELL' ? 'venda' : 'compra'}`, async ({
      request,
    }) => {
      const stamp = `${Date.now()}-${type}`;
      const owner = await registerAccount(
        {
          email: `laudo.owner.${stamp}@loopambiental.test`,
          password: 'LoopAmbiental123!',
          name: 'Laudo Dono',
        },
        { legalName: `Laudo Empresa ${stamp} Ltda.` },
      );
      const outsider = await registerAccount(
        {
          email: `laudo.outsider.${stamp}@loopambiental.test`,
          password: 'LoopAmbiental123!',
          name: 'Laudo Externo',
        },
        { legalName: `Laudo Externa ${stamp} Ltda.` },
      );
      const listingId = await createListing(owner, {
        title: `Laudo E2E ${stamp}`,
        type,
        categoryId: await firstCategoryId(request),
        quantity: '500.000',
        unit: 'kg',
      });
      const ownerCookie = await sessionCookie(request, owner);
      const mutation = {
        Origin: ORIGIN,
        'X-App-Action': '1',
        Cookie: ownerCookie,
      };

      const upload = await request.post(
        `${API_URL}/listings/${listingId}/documents`,
        {
          headers: mutation,
          multipart: {
            type: 'LAB_ANALYSIS',
            validUntil: '2030-12-31',
            document: {
              name: 'Laudo análise.pdf',
              mimeType: 'application/pdf',
              buffer: PDF,
            },
          },
        },
      );
      expect(upload.status()).toBe(201);
      const { document } = (await upload.json()) as {
        document: { id: string; type: string; fileName: string };
      };
      expect(document.type).toBe('LAB_ANALYSIS');
      expect(document.fileName).toBe('Laudo análise.pdf');

      const invalidType = await request.post(
        `${API_URL}/listings/${listingId}/documents`,
        {
          headers: mutation,
          multipart: {
            type: 'MSDS',
            document: {
              name: 'x.pdf',
              mimeType: 'application/pdf',
              buffer: PDF,
            },
          },
        },
      );
      expect(invalidType.status()).toBe(400);

      const download = await request.get(
        `${API_URL}/listings/documents/${document.id}/owner`,
        { headers: { Cookie: ownerCookie } },
      );
      expect(download.status()).toBe(200);
      expect(download.headers()['content-type']).toContain('application/pdf');
      expect(download.headers()['content-disposition']).toContain('attachment');
      expect((await download.body()).subarray(0, 5).toString()).toBe('%PDF-');

      // A draft listing's report is private to the owning company.
      const outsiderDownload = await request.get(
        `${API_URL}/listings/documents/${document.id}`,
        { headers: { Cookie: await sessionCookie(request, outsider) } },
      );
      expect(outsiderDownload.status()).toBe(404);

      const owned = await request.get(`${API_URL}/listings/mine/${listingId}`, {
        headers: { Cookie: ownerCookie },
      });
      const { listing } = (await owned.json()) as {
        listing: { documents: { id: string }[] };
      };
      expect(listing.documents.map((item) => item.id)).toContain(document.id);

      const removal = await request.delete(
        `${API_URL}/listings/${listingId}/documents/${document.id}`,
        { headers: mutation },
      );
      expect(removal.status()).toBe(204);
      const afterRemoval = await request.get(
        `${API_URL}/listings/documents/${document.id}/owner`,
        { headers: { Cookie: ownerCookie } },
      );
      expect(afterRemoval.status()).toBe(404);
    });
  }
});
