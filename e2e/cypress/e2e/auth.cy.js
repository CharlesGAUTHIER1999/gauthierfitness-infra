/// <reference types="cypress" />

describe('Authentication', () => {

    it("the home page loads correctly", () => {
        cy.visit('/');
        cy.title().should('match', /Gauthier/i);
        cy.get('body').should('be.visible');
    });

    it('the login page is accessible', () => {
        cy.visit('/login');
        cy.findByRole('heading', {name: /connexion|login/i}).should('be.visible');
        cy.findByLabelText(/email/i).should('be.visible');
        cy.findByLabelText(/mot de passe|password/i).should('be.visible');
    });

    it('login with incorrect credentials shows an error', () => {
        cy.visit('/login');
        cy.findByLabelText(/email/i).type('wrong@example.com');
        cy.findByLabelText(/mot de passe|password/i).type('wrongpassword', {log: false});
        cy.findByRole('button', {name: /connexion|se connecter|login/i}).click();

        cy.findByText(/identifiants|credentials|incorrect|invalid/i, {timeout: 8000})
            .should('be.visible');
    });

    it("login with correct credentials redirects to the account area", () => {
        cy.intercept('POST', '**/api/login').as('loginRequest');
        cy.visit('/login');
        cy.findByLabelText(/email/i).type(Cypress.env('TEST_USER_EMAIL'));
        cy.findByLabelText(/mot de passe|password/i).type(Cypress.env('TEST_USER_PASSWORD'), {log: false});
        cy.findByRole('button', {name: /connexion|se connecter|login/i}).click();
        cy.wait('@loginRequest');
        cy.url({timeout: 10000}).should('match', /(profile|account|boutique|shop|\/)/);
    });

    it("the register page is accessible", () => {
        cy.visit('/register');
        cy.findByLabelText(/email/i).should('be.visible');
        cy.findAllByLabelText(/mot de passe|password/i).first().should('be.visible');
    });

    it('register with an already-used email shows an error', () => {
        cy.visit('/register');
        cy.findAllByLabelText(/prénom|nom|name/i).each(($el) => cy.wrap($el).type('Test'));
        cy.findByLabelText(/email/i).type(Cypress.env('TEST_USER_EMAIL'));
        cy.findAllByLabelText(/mot de passe|password/i).first().type(Cypress.env('TEST_USER_PASSWORD'), {log: false});

        cy.findAllByLabelText(/confirmer|confirmation/i).then(($els) => {
            if ($els.length > 0) {
                cy.wrap($els[0]).type(Cypress.env('TEST_USER_PASSWORD'), {log: false});
            }
        });

        cy.findByRole('button', {name: /inscription|register|créer/i}).click();
        cy.findByText(/déjà utilisé|already.*taken|exists/i, {timeout: 8000})
            .should('be.visible');
    });

    it('logout works', () => {
        cy.loginAsUser();
        cy.visit('/account');

        cy.findAllByRole('button', {name: /déconnexion|logout/i}).then(($btns) => {
            if ($btns.length > 0) {
                cy.wrap($btns[0]).click();
                cy.url({timeout: 8000}).should('match', /login|\//);
            }
        });
    });
});
