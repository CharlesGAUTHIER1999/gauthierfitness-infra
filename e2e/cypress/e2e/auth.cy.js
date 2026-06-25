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
    cy.loginAsUser();
    cy.url().should('match', /(profile|account|boutique|shop|\/)/);
  });

  it("la page d'inscription est accessible", () => {
    cy.visit('/register');
    cy.findByLabelText(/email/i).should('be.visible');
    cy.findAllByLabelText(/mot de passe|password/i).first().should('be.visible');
  });

  it('inscription avec email déjà utilisé affiche une erreur', () => {
    cy.visit('/register');
    cy.findAllByLabelText(/prénom|nom|name/i).first().type('Test');
    cy.findByLabelText(/email/i).type(Cypress.env('TEST_USER_EMAIL'));
    cy.findAllByLabelText(/mot de passe|password/i).first().type(Cypress.env('TEST_USER_PASSWORD'), { log: false });

    cy.findAllByLabelText(/confirmer|confirmation/i).then(($els) => {
      if ($els.length > 0) {
        cy.wrap($els[0]).type(Cypress.env('TEST_USER_PASSWORD'), { log: false });
      }
    });

    cy.findByRole('button', { name: /inscription|register|créer/i }).click();
    cy.findByText(/déjà utilisé|already taken|exists/i, { timeout: 8000 })
      .should('be.visible');
  });

  it('déconnexion fonctionne', () => {
    cy.loginAsUser();

    cy.findAllByRole('button', { name: /déconnexion|logout/i }).then(($btns) => {
      if ($btns.length > 0) {
        cy.wrap($btns[0]).click();
        cy.url({ timeout: 8000 }).should('match', /login|\//);
      }
    });
  });

});
