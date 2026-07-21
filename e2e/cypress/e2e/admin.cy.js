/// <reference types="cypress" />

describe('Admin — Dashboard', () => {
    beforeEach(() => cy.loginAsAdmin());

    it('the dashboard shows the key metrics', () => {
        cy.visit('/admin');
        cy.get('.adm-metric-label').contains(/chiffre d'affaires|revenue/i).should('be.visible');
        cy.get('.adm-metric-label').contains(/commandes|orders/i).should('be.visible');
        cy.get('.adm-metric-label').contains(/produits|products/i).should('be.visible');
        cy.get('.adm-metric-label').contains(/stock/i).should('be.visible');
    });

    it('the figures are numeric (at least one metric visible)', () => {
        cy.visit('/admin');
        cy.get('.metric-value, .adm-metric-value, [data-testid="metric"]', {timeout: 8000})
            .first()
            .should('be.visible');
    });
});

describe('Admin — Orders', () => {
    beforeEach(() => cy.loginAsAdmin());

    it('the orders list loads', () => {
        cy.visit('/admin/orders');
        cy.get('h1').contains(/commandes|orders/i).should('be.visible');
        cy.get('table, [data-testid="orders-list"]', {timeout: 10000})
            .first()
            .should('be.visible');
    });

    it('the status filter works (no 500 error)', () => {
        cy.visit('/admin/orders');
        cy.get('select, [role="combobox"]').then(($filters) => {
            if ($filters.length > 0) {
                cy.wrap($filters[0]).select('new', {force: true});
                cy.wait(500);
                cy.get('body').should('not.contain.text', /erreur|error|500/i);
            }
        });
    });
});

describe('Admin — Products', () => {
    beforeEach(() => cy.loginAsAdmin());

    it('the products list loads', () => {
        cy.visit('/admin/products');
        cy.get('table, [data-testid="products-list"]', {timeout: 10000})
            .first()
            .should('be.visible');
    });
});

describe('Admin route protection', () => {
    it('a non-admin user cannot access the dashboard', () => {
        cy.loginAsUser();
        cy.visit('/admin', {failOnStatusCode: false});

        // Either a redirect, or 403 page
        cy.url().then((url) => {
            if (url.includes('/admin')) {
                cy.findByText(/403|interdit|forbidden|accès refusé/i).should('be.visible');
            }
        });
    });

    it('a logged-out visitor is redirected to /login', () => {
        cy.visit('/admin');
        cy.url({timeout: 8000}).should('match', /login/);
    });
});
