import {
  apiPath,
  API_URL,
  createListing,
  e2eAccounts,
  firstCategoryId,
  PROVISIONED_FILE,
  ProvisionedAccount,
  registerAccount,
} from './fixtures';
import { request } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

async function waitForApi() {
  const context = await request.newContext();
  try {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try {
        const response = await context.get(apiPath('/health'));
        if (response.ok()) return;
      } catch {
        // retry
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    throw new Error(`API did not become ready for E2E setup (${API_URL})`);
  } finally {
    await context.dispose();
  }
}

export default async function globalSetup() {
  await waitForApi();

  const seller = await registerAccount(
    {
      email: e2eAccounts.seller.email,
      password: e2eAccounts.seller.password,
      name: 'E2E Vendedor',
    },
    {
      legalName: `E2E Vendedora ${Date.now()} Ltda.`,
      city: 'São Paulo',
      state: 'SP',
    },
  );

  const buyer = await registerAccount(
    {
      email: e2eAccounts.buyer.email,
      password: e2eAccounts.buyer.password,
      name: 'E2E Comprador',
    },
    {
      legalName: `E2E Compradora ${Date.now()} Ltda.`,
      city: 'São Paulo',
      state: 'SP',
    },
  );

  const context = await request.newContext();
  const categoryId = await firstCategoryId(context);
  await context.dispose();

  if (categoryId) {
    await createListing(seller, {
      title: `E2E Sucata de alumínio ${Date.now()}`,
      type: 'SELL',
      categoryId,
      quantity: '1000.000',
      unit: 'kg',
      unitPrice: '8.50',
    });
  }

  const provisioned: Record<string, ProvisionedAccount> = { seller, buyer };
  mkdirSync(dirname(PROVISIONED_FILE), { recursive: true });
  writeFileSync(PROVISIONED_FILE, JSON.stringify(provisioned, null, 2));
}
