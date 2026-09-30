import { expect, test } from '@playwright/test';

test('home presents the LOOP AMBIENTAL marketplace', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('LOOP').first()).toBeVisible();
  await expect(
    page.getByRole('link', { name: /an[uú]ncios/i }).first(),
  ).toBeVisible();
});

test('listings page exposes search and filters', async ({ page }) => {
  await page.goto('/anuncios');
  await expect(
    page.getByRole('heading', { name: /oportunidades/i }),
  ).toBeVisible();
  await expect(page.getByLabel('Buscar anúncios')).toBeVisible();
  await expect(
    page.getByRole('button', { name: /buscar/i }).first(),
  ).toBeVisible();
});

test('plans page lists commercial plans', async ({ page }) => {
  await page.goto('/planos');
  await expect(
    page.getByRole('heading', { name: /plano da sua opera/i }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: /explorar/i })).toBeVisible();
});

test('login page renders the authentication form', async ({ page }) => {
  await page.goto('/entrar');
  await expect(
    page.getByRole('button', { name: /entrar/i }).first(),
  ).toBeVisible();
});
