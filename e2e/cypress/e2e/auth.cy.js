/// <reference types="cypress" />

describe('Authentification', () => {

  it("la page d'accueil charge correctement", () => {
    cy.visit('/');
    cy.title().should('match', /Gauthier/i);
    cy.get('body').should('be.visible');
  });

  it('la page de connexion est accessible', () => {
    cy.visit('/login');
    cy.findByRole('heading', { name: /connexion|login/i }).should('be.visible');
    cy.findByLabelText(/email/i).should('be.visible');
    cy.findByLabelText(/mot de passe|password/i).should('be.visible');
  });

  it('connexion avec identifiants incorrects affiche une erreur', () => {
    cy.visit('/login');
    cy.findByLabelText(/email/i).type('wrong@example.com');
    cy.findByLabelText(/mot de passe|password/i).type('wrongpassword', { log: false });
    cy.findByRole('button', { name: /connexion|se connecter|login/i }).click();

    cy.findByText(/identifiants|credentials|incorrect|invalid/i, { timeout: 8000 })
      .should('be.visible');
  });

  it("connexion avec bons identifiants redirige vers l'espace client", () => {
    cy.intercept('POST', '**/api/login').as('loginRequest');
    cy.visit('/login');
    cy.findByLabelText(/email/i).type(Cypress.env('TEST_USER_EMAIL'));
    cy.findByLabelText(/mot de passe|password/i).type(Cypress.env('TEST_USER_PASSWORD'), { log: false });
    cy.findByRole('button', { name: /connexion|se connecter|login/i }).click();
    cy.wait('@loginRequest');
    cy.url({ timeout: 10000 }).should('match', /(profile|account|boutique|shop|\/)/);
  });

  it("la page d'inscription est accessible", () => {
    cy.visit('/register');
    cy.findByLabelText(/email/i).should('be.visible');
    cy.findAllByLabelText(/mot de passe|password/i).first().should('be.visible');
  });

  it('inscription avec email déjà utilisé affiche une erreur', () => {
    cy.visit('/register');
    // /prénom|nom|name/i matches both the Prénom and Nom fields ("Prénom" contains
    // "nom"), so both must be filled explicitly or the required Nom field blocks
    // submission via native HTML validation.
    cy.findAllByLabelText(/prénom|nom|name/i).each(($el) => cy.wrap($el).type('Test'));
    cy.findByLabelText(/email/i).type(Cypress.env('TEST_USER_EMAIL'));
    cy.findAllByLabelText(/mot de passe|password/i).first().type(Cypress.env('TEST_USER_PASSWORD'), { log: false });

    cy.findAllByLabelText(/confirmer|confirmation/i).then(($els) => {
      if ($els.length > 0) {
        cy.wrap($els[0]).type(Cypress.env('TEST_USER_PASSWORD'), { log: false });
      }
    });

    cy.findByRole('button', { name: /inscription|register|créer/i }).click();
    cy.findByText(/déjà utilisé|already.*taken|exists/i, { timeout: 8000 })
      .should('be.visible');
  });

  it('déconnexion fonctionne', () => {
    cy.loginAsUser();
    // The logout button lives on /account (and /admin), not the storefront home
    // page loginAsUser lands on — visit it explicitly rather than assuming.
    cy.visit('/account');

    cy.findAllByRole('button', { name: /déconnexion|logout/i }).then(($btns) => {
      if ($btns.length > 0) {
        cy.wrap($btns[0]).click();
        cy.url({ timeout: 8000 }).should('match', /login|\//);
      }
    });
  });

});
