import { expect, test } from '@playwright/test';
import { e2eAccounts, loginViaUi } from './support/fixtures';

const sections = [
  ['/admin/usuarios', 'Usuários'],
  ['/admin/empresas', 'Empresas'],
  ['/admin/anuncios', 'Anúncios'],
  ['/admin/assinaturas', 'Assinaturas'],
  ['/admin/pagamentos', 'Pagamentos'],
  ['/admin/auditoria', 'Auditoria'],
  ['/admin/configuracoes', 'Configurações'],
] as const;

test.describe('painel administrativo', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaUi(page, e2eAccounts.admin);
  });

  for (const [path, heading] of sections) {
    test(`admin section ${path} renders`, async ({ page }) => {
      await page.goto(path);
      await expect(
        page.getByRole('heading', { name: heading, exact: true }),
      ).toBeVisible();
    });
  }
});
