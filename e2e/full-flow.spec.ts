import { APIRequestContext, expect, test } from '@playwright/test';
import sharp from 'sharp';
import {
  API_URL,
  createListing,
  e2eAccounts,
  firstCategoryId,
  registerAccount,
} from './support/fixtures';

const ORIGIN = process.env.E2E_WEB_ORIGIN ?? 'http://localhost:3000';

async function adminApiToken(request: APIRequestContext) {
  const response = await request.post(`${API_URL}/auth/login`, {
    headers: { Origin: ORIGIN },
    data: e2eAccounts.admin,
  });
  const setCookie = response.headers()['set-cookie'] ?? '';
  return /loopambiental_session=([^;]+)/.exec(setCookie)?.[1] ?? null;
}

test.describe('fluxo completo do marketplace', () => {
  test('conta, empresa, anúncio com imagem, moderação, proposta, negociação e chat', async ({
    request,
  }) => {
    const stamp = Date.now();
    const seller = await registerAccount(
      {
        email: `flow.seller.${stamp}@loopambiental.test`,
        password: 'LoopAmbiental123!',
        name: 'Fluxo Vendedor',
      },
      { legalName: `Fluxo Vendedora ${stamp} Ltda.` },
    );
    const buyer = await registerAccount(
      {
        email: `flow.buyer.${stamp}@loopambiental.test`,
        password: 'LoopAmbiental123!',
        name: 'Fluxo Comprador',
      },
      { legalName: `Fluxo Compradora ${stamp} Ltda.` },
    );

    const categoryId = await firstCategoryId(request);
    expect(categoryId).toBeTruthy();

    const listingId = await createListing(seller, {
      title: `Fluxo E2E ${stamp}`,
      type: 'SELL',
      categoryId,
      quantity: '1000.000',
      unit: 'kg',
      unitPrice: '9.90',
    });

    // Upload a real image.
    const png = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 3,
        background: { r: 120, g: 200, b: 90 },
      },
    })
      .png()
      .toBuffer();

    const sellerLogin = await request.post(`${API_URL}/auth/login`, {
      headers: { Origin: ORIGIN },
      data: { email: seller.email, password: seller.password },
    });
    const sellerCookie =
      /loopambiental_session=([^;]+)/.exec(
        sellerLogin.headers()['set-cookie'] ?? '',
      )?.[1] ?? '';

    const upload = await request.post(
      `${API_URL}/listings/${listingId}/media`,
      {
        headers: {
          Origin: ORIGIN,
          'X-App-Action': '1',
          Cookie: `loopambiental_session=${sellerCookie}`,
        },
        multipart: {
          photos: { name: 'foto.png', mimeType: 'image/png', buffer: png },
        },
      },
    );
    expect(upload.ok()).toBeTruthy();
    const mediaBody = (await upload.json()) as { media: { id: string }[] };
    expect(mediaBody.media.length).toBeGreaterThan(0);

    // Submit for review.
    const submit = await request.post(
      `${API_URL}/listings/${listingId}/submit`,
      {
        headers: {
          Origin: ORIGIN,
          'X-App-Action': '1',
          Cookie: `loopambiental_session=${sellerCookie}`,
        },
      },
    );
    expect(submit.ok()).toBeTruthy();

    // Admin approves moderation.
    const adminCookie = await adminApiToken(request);
    expect(adminCookie).toBeTruthy();
    const queue = await request.get(`${API_URL}/admin/moderation/cases`, {
      headers: {
        Origin: ORIGIN,
        Cookie: `loopambiental_session=${adminCookie}`,
      },
    });
    const cases = (await queue.json()) as {
      cases: { id: string; listingId: string }[];
    };
    const target = cases.cases.find((c) => c.listingId === listingId);
    expect(target).toBeTruthy();
    const approve = await request.post(
      `${API_URL}/admin/moderation/cases/${target!.id}/approve`,
      {
        headers: {
          Origin: ORIGIN,
          'X-App-Action': '1',
          'X-Admin-Action': '1',
          Cookie: `loopambiental_session=${adminCookie}`,
        },
      },
    );
    expect(approve.ok()).toBeTruthy();

    // Public search finds it and media is public.
    const search = await request.get(
      `${API_URL}/listings?q=${encodeURIComponent(`Fluxo E2E ${stamp}`)}`,
    );
    expect(search.ok()).toBeTruthy();
    const searchBody = (await search.json()) as { data: { id: string }[] };
    expect(searchBody.data.some((item) => item.id === listingId)).toBeTruthy();

    const mediaRead = await request.get(
      `${API_URL}/listings/media/${mediaBody.media[0].id}`,
    );
    expect(mediaRead.status()).toBe(200);

    // Buyer login for proposal + chat.
    const buyerLogin = await request.post(`${API_URL}/auth/login`, {
      headers: { Origin: ORIGIN },
      data: { email: buyer.email, password: buyer.password },
    });
    const buyerCookie =
      /loopambiental_session=([^;]+)/.exec(
        buyerLogin.headers()['set-cookie'] ?? '',
      )?.[1] ?? '';

    const proposal = await request.post(`${API_URL}/proposals`, {
      headers: {
        Origin: ORIGIN,
        'X-App-Action': '1',
        Cookie: `loopambiental_session=${buyerCookie}`,
      },
      data: {
        listingId,
        proposerCompanyId: buyer.companyId,
        quantity: '500.000',
        unitPrice: '9.50',
        notes: 'Proposta E2E',
      },
    });
    expect(proposal.ok()).toBeTruthy();
    const proposalId = ((await proposal.json()) as { proposal: { id: string } })
      .proposal.id;

    const accept = await request.post(
      `${API_URL}/proposals/${proposalId}/accept`,
      {
        headers: {
          Origin: ORIGIN,
          'X-App-Action': '1',
          Cookie: `loopambiental_session=${sellerCookie}`,
        },
      },
    );
    expect(accept.ok()).toBeTruthy();

    const conversation = await request.post(`${API_URL}/conversations`, {
      headers: {
        Origin: ORIGIN,
        'X-App-Action': '1',
        Cookie: `loopambiental_session=${buyerCookie}`,
      },
      data: { proposalId },
    });
    expect(conversation.ok()).toBeTruthy();
    const conversationId = (
      (await conversation.json()) as { conversation: { id: string } }
    ).conversation.id;

    const message = await request.post(
      `${API_URL}/conversations/${conversationId}/messages`,
      {
        headers: {
          Origin: ORIGIN,
          'X-App-Action': '1',
          Cookie: `loopambiental_session=${sellerCookie}`,
        },
        data: { body: 'Olá! Combinamos a retirada.' },
      },
    );
    expect(message.ok()).toBeTruthy();

    const messages = await request.get(
      `${API_URL}/conversations/${conversationId}/messages`,
      {
        headers: {
          Origin: ORIGIN,
          Cookie: `loopambiental_session=${buyerCookie}`,
        },
      },
    );
    const messageBody = (await messages.json()) as {
      messages: { body: string }[];
    };
    expect(messageBody.messages.length).toBeGreaterThan(0);
  });
});
