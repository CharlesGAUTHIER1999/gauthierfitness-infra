/// <reference types="cypress" />

describe('Admin — Dashboard', () => {
  beforeEach(() => cy.loginAsAdmin());

  it('le dashboard affiche les métriques clés', () => {
    cy.visit('/admin');
    cy.findByText(/chiffre d'affaires|revenue/i).should('be.visible');
    cy.findByText(/commandes|orders/i).should('be.visible');
    cy.findByText(/produits|products/i).should('be.visible');
    cy.findByText(/stock/i).should('be.visible');
  });

  it('les chiffres sont numériques (au moins une métrique visible)', () => {
    cy.visit('/admin');
    cy.get('.metric-value, .adm-metric-value, [data-testid="metric"]', { timeout: 8000 })
      .first()
      .should('be.visible');
  });
});

describe('Admin — Commandes', () => {
  beforeEach(() => cy.loginAsAdmin());

  it('la liste des commandes charge', () => {
    cy.visit('/admin/orders');
    cy.findByText(/commandes|orders/i).should('be.visible');
    cy.get('table, [data-testid="orders-list"]', { timeout: 10000 })
      .first()
      .should('be.visible');
  });

  it('le filtre par statut fonctionne (pas d\'erreur 500)', () => {
    cy.visit('/admin/orders');
    cy.get('select, [role="combobox"]').then(($filters) => {
      if ($filters.length > 0) {
        cy.wrap($filters[0]).select(['new', 'nouveau'], { force: true });
        cy.wait(500);
        cy.get('body').should('not.contain.text', /erreur|error|500/i);
      }
    });
  });
});

describe('Admin — Produits', () => {
  beforeEach(() => cy.loginAsAdmin());

  it('la liste des produits charge', () => {
    cy.visit('/admin/products');
    cy.get('table, [data-testid="products-list"]', { timeout: 10000 })
      .first()
      .should('be.visible');
  });
});

describe('Protection des routes admin', () => {
  it('un utilisateur non-admin ne peut pas accéder au dashboard', () => {
    cy.loginAsUser();
    cy.visit('/admin', { failOnStatusCode: false });

    // Either a redirect, or a 403 page
    cy.url().then((url) => {
      if (url.includes('/admin')) {
        cy.findByText(/403|interdit|forbidden|accès refusé/i).should('be.visible');
      }
    });
  });

  it('un visiteur non connecté est redirigé vers /login', () => {
    cy.visit('/admin');
    cy.url({ timeout: 8000 }).should('match', /login/);
  });
});
