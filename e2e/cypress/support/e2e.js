// Commandes Cypress globales et plugins.
import '@testing-library/cypress/add-commands';

/**
 * Cypress.Commands.add('loginAsAdmin', ...) — Helper de connexion admin partagé
 * par les specs admin/stock.
 */
Cypress.Commands.add('loginAsAdmin', () => {
  const email = Cypress.env('TEST_ADMIN_EMAIL');
  const password = Cypress.env('TEST_ADMIN_PASSWORD');

  cy.visit('/login');
  cy.findByLabelText(/email/i).type(email);
  cy.findByLabelText(/mot de passe|password/i).type(password, { log: false });
  cy.findByRole('button', { name: /connexion|se connecter|login/i }).click();
  cy.url({ timeout: 10000 }).should('match', /admin/);
});

Cypress.Commands.add('loginAsUser', () => {
  const email = Cypress.env('TEST_USER_EMAIL');
  const password = Cypress.env('TEST_USER_PASSWORD');

  cy.visit('/login');
  cy.findByLabelText(/email/i).type(email);
  cy.findByLabelText(/mot de passe|password/i).type(password, { log: false });
  cy.findByRole('button', { name: /connexion|se connecter|login/i }).click();
  cy.url({ timeout: 10000 }).should('match', /(profile|account|boutique|shop|\/)/);
});
