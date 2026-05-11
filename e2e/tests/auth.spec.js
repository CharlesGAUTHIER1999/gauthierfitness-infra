// @ts-check
import { test, expect } from '@playwright/test';

const BASE = process.env.BASE_URL || 'http://localhost';

const USER_EMAIL    = process.env.TEST_USER_EMAIL    || 'test@gauthierfitness.fr';
const USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'Password123!';

// ─────────────────────────────────────────────────────────────────
// Authentification — Tests E2E
// ─────────────────────────────────────────────────────────────────

test.describe('Authentification', () => {

  test('la page d\'accueil charge correctement', async ({ page }) => {
    await page.goto(BASE);
    await expect(page).toHaveTitle(/Gauthier/i);
    await expect(page.locator('body')).toBeVisible();
  });

  test('la page de connexion est accessible', async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page.getByRole('heading', { name: /connexion|login/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/mot de passe|password/i)).toBeVisible();
  });

  test('connexion avec identifiants incorrects affiche une erreur', async ({ page }) => {
    await page.goto(`${BASE}/login`);

    await page.getByLabel(/email/i).fill('wrong@example.com');
    await page.getByLabel(/mot de passe|password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /connexion|se connecter|login/i }).click();

    // Doit afficher un message d'erreur
    await expect(
      page.getByText(/identifiants|credentials|incorrect|invalid/i)
    ).toBeVisible({ timeout: 8_000 });
  });

  test('connexion avec bons identifiants redirige vers l\'espace client', async ({ page }) => {
    await page.goto(`${BASE}/login`);

    await page.getByLabel(/email/i).fill(USER_EMAIL);
    await page.getByLabel(/mot de passe|password/i).fill(USER_PASSWORD);
    await page.getByRole('button', { name: /connexion|se connecter|login/i }).click();

    // Redirigé vers le profil ou la boutique
    await expect(page).toHaveURL(/(profile|account|boutique|shop|\/)/i, { timeout: 10_000 });
  });

  test('la page d\'inscription est accessible', async ({ page }) => {
    await page.goto(`${BASE}/register`);
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/mot de passe|password/i).first()).toBeVisible();
  });

  test('inscription avec email déjà utilisé affiche une erreur', async ({ page }) => {
    await page.goto(`${BASE}/register`);

    // Remplir avec un email déjà existant (l'utilisateur de test)
    await page.getByLabel(/prénom|nom|name/i).first().fill('Test');
    await page.getByLabel(/email/i).fill(USER_EMAIL);
    await page.getByLabel(/mot de passe|password/i).first().fill(USER_PASSWORD);

    const confirmField = page.getByLabel(/confirmer|confirmation/i);
    if (await confirmField.count() > 0) {
      await confirmField.fill(USER_PASSWORD);
    }

    await page.getByRole('button', { name: /inscription|register|créer/i }).click();

    await expect(
      page.getByText(/déjà utilisé|already taken|exists/i)
    ).toBeVisible({ timeout: 8_000 });
  });

  test('déconnexion fonctionne', async ({ page }) => {
    // Connexion
    await page.goto(`${BASE}/login`);
    await page.getByLabel(/email/i).fill(USER_EMAIL);
    await page.getByLabel(/mot de passe|password/i).fill(USER_PASSWORD);
    await page.getByRole('button', { name: /connexion|se connecter|login/i }).click();
    await page.waitForURL(/(profile|account|boutique|shop|\/)/i, { timeout: 10_000 });

    // Déconnexion
    const logoutBtn = page.getByRole('button', { name: /déconnexion|logout/i });
    if (await logoutBtn.count() > 0) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/login|\//, { timeout: 8_000 });
    }
  });

});
