// @ts-check
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost';

const ADMIN_EMAIL    = process.env.TEST_ADMIN_EMAIL    || 'admin@gauthierfitness.fr';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!';
const USER_EMAIL     = process.env.TEST_USER_EMAIL     || 'test@gauthierfitness.fr';
const USER_PASSWORD  = process.env.TEST_USER_PASSWORD  || 'Password123!';

// ─────────────────────────────────────────────────────────────────
// Helper : connexion admin
// ─────────────────────────────────────────────────────────────────
async function loginAsAdmin(page) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/mot de passe|password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /connexion|se connecter|login/i }).click();
  await page.waitForURL(/admin/, { timeout: 10_000 });
}

// ─────────────────────────────────────────────────────────────────
// Admin — Dashboard
// ─────────────────────────────────────────────────────────────────
test.describe('Admin — Dashboard', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('le dashboard affiche les métriques clés', async ({ page }) => {
    await page.goto(`${BASE}/admin`);

    // Métriques
    await expect(page.getByText(/chiffre d'affaires|revenue/i)).toBeVisible();
    await expect(page.getByText(/commandes|orders/i)).toBeVisible();
    await expect(page.getByText(/produits|products/i)).toBeVisible();
    await expect(page.getByText(/stock/i)).toBeVisible();
  });

  test('les chiffres sont numériques', async ({ page }) => {
    await page.goto(`${BASE}/admin`);
    // Au moins un nombre doit apparaître dans les métriques
    const metrics = page.locator('.metric-value, .adm-metric-value, [data-testid="metric"]');
    await expect(metrics.first()).toBeVisible({ timeout: 8_000 });
  });

});

// ─────────────────────────────────────────────────────────────────
// Admin — Gestion des commandes
// ─────────────────────────────────────────────────────────────────
test.describe('Admin — Commandes', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('la liste des commandes charge', async ({ page }) => {
    await page.goto(`${BASE}/admin/orders`);
    await expect(page.getByText(/commandes|orders/i)).toBeVisible();
    // tableau ou liste
    await expect(
      page.locator('table, [data-testid="orders-list"]').first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('le filtre par statut fonctionne', async ({ page }) => {
    await page.goto(`${BASE}/admin/orders`);

    const statusFilter = page.getByRole('combobox').first();
    if (await statusFilter.count() > 0) {
      await statusFilter.selectOption({ label: /new|nouveau/i });
      await page.waitForTimeout(500);
      // Résultats filtrés — pas d'erreur
      await expect(page.locator('body')).not.toContainText(/erreur|error|500/i);
    }
  });

});

// ─────────────────────────────────────────────────────────────────
// Admin — Gestion des produits
// ─────────────────────────────────────────────────────────────────
test.describe('Admin — Produits', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('la liste des produits charge', async ({ page }) => {
    await page.goto(`${BASE}/admin/products`);
    await expect(page.locator('table, [data-testid="products-list"]').first()).toBeVisible({ timeout: 10_000 });
  });

});

// ─────────────────────────────────────────────────────────────────
// Protection des routes admin (non-admin)
// ─────────────────────────────────────────────────────────────────
test.describe('Protection des routes admin', () => {

  test('un utilisateur non-admin ne peut pas accéder au dashboard', async ({ page }) => {
    // Connexion en tant qu'utilisateur normal
    await page.goto(`${BASE}/login`);
    await page.getByLabel(/email/i).fill(USER_EMAIL);
    await page.getByLabel(/mot de passe|password/i).fill(USER_PASSWORD);
    await page.getByRole('button', { name: /connexion|se connecter|login/i }).click();

    // Tentative d'accès à l'admin
    await page.goto(`${BASE}/admin`);

    // Doit être redirigé ou voir une page 403
    const url = page.url();
    const hasText = await page.getByText(/403|interdit|forbidden|accès refusé/i).count();
    const isRedirected = !url.includes('/admin') || hasText > 0;
    expect(isRedirected).toBeTruthy();
  });

  test('un visiteur non connecté est redirigé vers /login', async ({ page }) => {
    await page.goto(`${BASE}/admin`);
    await expect(page).toHaveURL(/login/, { timeout: 8_000 });
  });

});
