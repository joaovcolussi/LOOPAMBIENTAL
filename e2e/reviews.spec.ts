import { expect, test } from '@playwright/test';
import { loginViaUi, provisionedAccount } from './support/fixtures';

test('authenticated user sees the reviews area', async ({ page }) => {
  await loginViaUi(page, provisionedAccount('buyer'));

  await page.goto('/dashboard/avaliacoes');
  await expect(
    page.getByRole('heading', { name: 'Avaliações', exact: true }),
  ).toBeVisible();
});
