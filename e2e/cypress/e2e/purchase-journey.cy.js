/// <reference types="cypress" />

describe('Parcours d\'achat', () => {
  it('parcourt un produit, l\'ajoute au panier et atteint l\'étape de paiement Stripe', () => {
    cy.loginAsUser();

    cy.request('/api/products?per_page=50').then(({ body }) => {
      const product = body.data[0];
      expect(product, 'un produit existe').to.exist;
      cy.visit(`/products/${product.slug}`);

      cy.get('body').then(($body) => {
        const opt = $body.find('.pd-size:not([disabled])').first();
        if (opt.length) cy.wrap(opt).click();
      });

      cy.findByRole('button', { name: /ajouter au panier/i }).click();
    });

    cy.visit('/checkout');
    cy.get('#email').clear().type('e2e-purchase@gauthierfitness.fr');
    cy.get('#firstname').clear().type('Test');
    cy.get('#lastname').clear().type('E2E');
    cy.get('#address').clear().type('12 Rue de la Paix');
    cy.get('#zip').clear().type('75002');
    cy.get('#city').clear().type('Paris');
    cy.findByRole('button', { name: /continuer vers le paiement/i }).click();

    cy.get('.ck-payment-element iframe[name^="__privateStripeFrame"]', { timeout: 15000 })
      .should('exist');
    cy.findByRole('button', { name: /payer maintenant/i }).should('be.visible').and('not.be.disabled');
  });
});

describe('Parcours d\'achat invité', () => {
  it('permet de finaliser un achat sans être connecté, avec une option pour se connecter au checkout', () => {

    cy.request('/api/products?per_page=50').then(({ body }) => {
      const product = body.data[0];
      expect(product, 'un produit existe').to.exist;
      cy.visit(`/products/${product.slug}`);

      cy.get('body').then(($body) => {
        const opt = $body.find('.pd-size:not([disabled])').first();
        if (opt.length) cy.wrap(opt).click();
      });

      cy.findByRole('button', { name: /ajouter au panier/i }).click();
    });

    cy.visit('/checkout');
    cy.location('pathname').should('eq', '/checkout');
    cy.findByRole('link', { name: /se connecter/i }).should('be.visible');
    cy.get('#email').clear().type('e2e-guest@gauthierfitness.fr');
    cy.get('#firstname').clear().type('Invité');
    cy.get('#lastname').clear().type('E2E');
    cy.get('#address').clear().type('12 Rue de la Paix');
    cy.get('#zip').clear().type('75002');
    cy.get('#city').clear().type('Paris');
    cy.findByRole('button', { name: /continuer vers le paiement/i }).click();

    cy.get('.ck-payment-element iframe[name^="__privateStripeFrame"]', { timeout: 15000 })
      .should('exist');
    cy.findByRole('button', { name: /payer maintenant/i }).should('be.visible').and('not.be.disabled');
  });
});

describe('Personnalisation produit', () => {
  it('la page de personnalisation charge correctement pour un produit personnalisable', () => {
    cy.loginAsUser();

    cy.request('/api/products?per_page=200').then(({ body }) => {
      const product = body.data.find((p) => p.is_customizable);
      expect(product, 'un produit personnalisable existe').to.exist;
      cy.visit(`/products/${product.slug}/customize`);
      cy.get('h1.pc-title', { timeout: 10000 }).should('contain.text', product.name);
      cy.get('canvas', { timeout: 10000 }).should('exist');
    });
  });
});
