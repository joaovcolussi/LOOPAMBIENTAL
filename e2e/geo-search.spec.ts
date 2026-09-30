import { expect, test } from '@playwright/test';
import { API_URL } from './support/fixtures';

test('search API orders by distance from a reference point', async ({
  request,
}) => {
  const response = await request.get(
    `${API_URL}/listings?latitude=-23.5505&longitude=-46.6333&radiusKm=100&sort=distance&pageSize=20`,
  );
  test.skip(!response.ok(), 'API not available');
  const body = (await response.json()) as {
    sort: string;
    data: { distanceKm: number | null }[];
  };
  expect(body.sort).toBe('distance');
  const distances = body.data
    .map((item) => item.distanceKm)
    .filter((value): value is number => typeof value === 'number');
  for (const distance of distances) expect(distance).toBeLessThanOrEqual(100);
  const sorted = [...distances].sort((a, b) => a - b);
  expect(distances).toEqual(sorted);
});

test('listings page exposes the distance filter', async ({ page }) => {
  await page.goto('/anuncios');
  await expect(
    page.getByRole('button', { name: /usar minha localização/i }),
  ).toBeVisible();
});
