import { APIRequestContext, Page, request } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const API_URL =
  process.env.E2E_API_URL ?? 'http://localhost:3001/api/v1';

// Playwright resolves absolute paths ("/foo") against the origin, dropping any
// base path. Building requests from API_URL directly avoids that pitfall.
export function apiPath(path: string) {
  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export const PROVISIONED_FILE = join(
  process.cwd(),
  'test-results',
  'e2e-provisioned.json',
);

export type ProvisionedAccount = {
  email: string;
  password: string;
  companyId: string;
  companySlug: string | null;
};

export const e2eAccounts = {
  seller: {
    email: process.env.E2E_SELLER_EMAIL ?? 'e2e.seller@loopambiental.test',
    password: 'LoopAmbiental123!',
  },
  buyer: {
    email: process.env.E2E_BUYER_EMAIL ?? 'e2e.buyer@loopambiental.test',
    password: 'LoopAmbiental123!',
  },
  admin: {
    email: process.env.E2E_ADMIN_EMAIL ?? 'admin@loopambiental.com',
    password: process.env.E2E_ADMIN_PASSWORD ?? 'loopambiental',
  },
};

// Fixed accounts are reused across runs: registration returns 409 and the
// helper falls back to logging in, so provisioning stays idempotent.
async function uniqueEmail(base: string) {
  return base;
}

function newContext(headers: Record<string, string> = {}) {
  return request.newContext({
    extraHTTPHeaders: {
      Origin: process.env.E2E_WEB_ORIGIN ?? 'http://localhost:3000',
      'X-App-Action': '1',
      ...headers,
    },
  });
}

export async function registerAccount(
  input: { email: string; password: string; name: string },
  company: { legalName: string; city?: string; state?: string },
): Promise<ProvisionedAccount> {
  const context = await newContext();
  try {
    const email = await uniqueEmail(input.email);
    const registerResponse = await context.post(apiPath('/auth/register'), {
      data: { name: input.name, email, password: input.password },
    });
    if (!registerResponse.ok() && registerResponse.status() !== 409) {
      throw new Error(
        `register failed (${registerResponse.status()}): ${await registerResponse.text()}`,
      );
    }
    if (registerResponse.status() === 409) {
      const login = await context.post(apiPath('/auth/login'), {
        data: { email, password: input.password },
      });
      if (!login.ok())
        throw new Error(
          `login failed (${login.status()}): ${await login.text()}`,
        );
    }

    const companyResponse = await context.post(apiPath('/companies'), {
      data: {
        legalName: company.legalName,
        city: company.city ?? 'São Paulo',
        state: company.state ?? 'SP',
        contactVisibility: 'PUBLIC',
      },
    });
    if (!companyResponse.ok())
      throw new Error(
        `company failed (${companyResponse.status()}): ${await companyResponse.text()}`,
      );
    const { company: createdCompany } = (await companyResponse.json()) as {
      company: { id: string; slug: string | null };
    };
    return {
      email,
      password: input.password,
      companyId: createdCompany.id,
      companySlug: createdCompany.slug,
    };
  } finally {
    await context.dispose();
  }
}

export async function createListing(
  account: ProvisionedAccount,
  input: {
    title: string;
    type: 'BUY' | 'SELL';
    categoryId: string;
    quantity: string;
    unit: string;
    unitPrice?: string;
    city?: string;
    state?: string;
  },
) {
  const context = await newContext();
  try {
    await context.post(apiPath('/auth/login'), {
      data: { email: account.email, password: account.password },
    });
    const response = await context.post(apiPath('/listings'), {
      data: {
        companyId: account.companyId,
        type: input.type,
        title: input.title,
        categoryId: input.categoryId,
        quantity: input.quantity,
        unit: input.unit,
        ...(input.unitPrice ? { unitPrice: input.unitPrice } : {}),
        city: input.city ?? 'São Paulo',
        state: input.state ?? 'SP',
      },
    });
    if (!response.ok())
      throw new Error(
        `listing failed (${response.status()}): ${await response.text()}`,
      );
    const { listing } = (await response.json()) as { listing: { id: string } };
    return listing.id;
  } finally {
    await context.dispose();
  }
}

export async function loginViaUi(
  page: Page,
  account: { email: string; password: string },
) {
  await page.goto('/entrar');
  await page.getByLabel('E-mail').fill(account.email);
  await page.getByLabel('Senha').fill(account.password);
  await page.getByRole('button', { name: /entrar/i }).click();
  await page.waitForURL(/\/(dashboard|admin)/);
}

export function provisionedAccount(
  key: 'seller' | 'buyer',
): ProvisionedAccount {
  if (existsSync(PROVISIONED_FILE)) {
    try {
      const parsed = JSON.parse(
        readFileSync(PROVISIONED_FILE, 'utf8'),
      ) as Record<string, ProvisionedAccount>;
      if (parsed[key]) return parsed[key];
    } catch {
      // fall through to defaults
    }
  }
  return {
    email: e2eAccounts[key].email,
    password: e2eAccounts[key].password,
    companyId: '',
    companySlug: null,
  };
}

export function provisionedAccounts(): Record<
  'seller' | 'buyer',
  ProvisionedAccount
> {
  return {
    seller: provisionedAccount('seller'),
    buyer: provisionedAccount('buyer'),
  };
}

export async function firstCategoryId(context: APIRequestContext) {
  const response = await context.get(apiPath('/categories'));
  const { categories } = (await response.json()) as {
    categories: { id: string }[];
  };
  return categories[0]?.id ?? '';
}
