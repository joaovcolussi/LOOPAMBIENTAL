import { expect, test } from '@playwright/test';
import { loginViaUi, provisionedAccount } from './support/fixtures';

test('authenticated company member can review the subscription', async ({
  page,
}) => {
  await loginViaUi(page, provisionedAccount('buyer'));

  await page.goto('/dashboard/assinatura');
  await expect(
    page.getByRole('heading', { name: 'Assinatura', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/plano atual|nenhuma assinatura ativa/i),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: /assinar|plano atual/i }).first(),
  ).toBeVisible();
});
