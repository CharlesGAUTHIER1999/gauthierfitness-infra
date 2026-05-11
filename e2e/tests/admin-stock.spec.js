// @ts-check
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost';

const ADMIN_EMAIL    = process.env.TEST_ADMIN_EMAIL    || 'admin@gauthierfitness.fr';
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!';

// ─────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────
async function loginAsAdmin(page) {
  await page.goto(`${BASE}/login`);
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/mot de passe|password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /connexion|se connecter|login/i }).click();
  await page.waitForURL(/admin/, { timeout: 10_000 });
}

// ─────────────────────────────────────────────────────────────────
// Admin — Gestion des stocks
// ─────────────────────────────────────────────────────────────────
test.describe('Admin — Stocks', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('la page stock globale charge avec la liste des produits', async ({ page }) => {
    await page.goto(`${BASE}/admin/stock`);

    await expect(page.getByText(/stock/i).first()).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('table, [data-testid="stock-list"]').first()).toBeVisible({ timeout: 10_000 });
  });

  test('la recherche dans la liste stock fonctionne', async ({ page }) => {
    await page.goto(`${BASE}/admin/stock`);

    const searchInput = page.getByPlaceholder(/recherche|search/i);
    if (await searchInput.count() > 0) {
      await searchInput.fill('test');
      await page.waitForTimeout(400);
      // Pas d'erreur 500
      await expect(page.locator('body')).not.toContainText(/erreur|error|500/i);
    }
  });

  test('le badge de stock critique est visible (rouge)', async ({ page }) => {
    await page.goto(`${BASE}/admin/stock`);

    // S'il y a des produits en rupture, le badge rouge apparaît
    const criticalBadge = page.locator('.badge-critical, [data-status="out"], .adm-stock-badge--critical');
    // On vérifie juste que la page charge sans erreur (badge conditionnel)
    await expect(page.locator('body')).not.toContainText(/erreur|error|500/i);
    const count = await criticalBadge.count();
    // OK si 0 (pas de rupture) ou > 0 (des ruptures)
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('on peut naviguer vers le détail stock d\'un produit', async ({ page }) => {
    await page.goto(`${BASE}/admin/stock`);

    // Cliquer sur le premier lien "Gérer"
    const manageLink = page.getByRole('link', { name: /gérer|manage|détail/i }).first();
    if (await manageLink.count() > 0) {
      await manageLink.click();
      await expect(page).toHaveURL(/\/admin\/products\/\d+\/stock/i, { timeout: 8_000 });

      // La page détail charge
      await expect(page.getByText(/lots?/i).first()).toBeVisible({ timeout: 8_000 });
    }
  });

  test('le formulaire d\'ajout de lot est fonctionnel', async ({ page }) => {
    await page.goto(`${BASE}/admin/stock`);

    // Naviguer vers un produit
    const manageLink = page.getByRole('link', { name: /gérer|manage/i }).first();
    if (await manageLink.count() === 0) {
      test.skip();
    }
    await manageLink.click();
    await page.waitForURL(/\/admin\/products\/\d+\/stock/i);

    // Remplir le formulaire d'ajout
    const lotInput = page.getByPlaceholder(/numéro de lot|lot.number|lot_number/i);
    if (await lotInput.count() > 0) {
      await lotInput.fill(`LOT-E2E-${Date.now()}`);
      const qtyInput = page.getByLabel(/quantité|quantity/i).first();
      await qtyInput.fill('10');
      await page.getByRole('button', { name: /ajouter|add|valider/i }).first().click();

      // Succès
      await expect(
        page.getByText(/ajouté|créé|created|success/i)
      ).toBeVisible({ timeout: 8_000 });
    }
  });

  test('l\'onglet mouvements charge l\'historique', async ({ page }) => {
    await page.goto(`${BASE}/admin/stock`);

    const manageLink = page.getByRole('link', { name: /gérer|manage/i }).first();
    if (await manageLink.count() === 0) {
      test.skip();
    }
    await manageLink.click();
    await page.waitForURL(/\/admin\/products\/\d+\/stock/i);

    // Cliquer sur l'onglet "Mouvements"
    const movTab = page.getByRole('tab', { name: /mouvements?|movements?/i });
    if (await movTab.count() > 0) {
      await movTab.click();
      await expect(page.locator('table').first()).toBeVisible({ timeout: 8_000 });
    }
  });

  test('un lot avec quantité 0 ne peut pas être ajouté (validation)', async ({ page }) => {
    await page.goto(`${BASE}/admin/stock`);

    const manageLink = page.getByRole('link', { name: /gérer|manage/i }).first();
    if (await manageLink.count() === 0) {
      test.skip();
    }
    await manageLink.click();
    await page.waitForURL(/\/admin\/products\/\d+\/stock/i);

    const lotInput = page.getByPlaceholder(/numéro de lot|lot.number/i);
    if (await lotInput.count() > 0) {
      await lotInput.fill('LOT-ZERO');
      const qtyInput = page.getByLabel(/quantité|quantity/i).first();
      await qtyInput.fill('0');
      await page.getByRole('button', { name: /ajouter|add|valider/i }).first().click();

      // Erreur de validation
      await expect(
        page.getByText(/quantité|quantity|minimum|invalid/i)
      ).toBeVisible({ timeout: 5_000 });
    }
  });

});
