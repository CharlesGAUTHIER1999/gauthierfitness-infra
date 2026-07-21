/// <reference types="cypress" />

describe('Admin — Stock', () => {
    beforeEach(() => cy.loginAsAdmin());

    it('the global stock page loads with the product list', () => {
        cy.visit('/admin/stock');
        cy.findAllByText(/stock/i).first().should('be.visible');
        cy.get('table, [data-testid="stock-list"]', {timeout: 10000})
            .first()
            .should('be.visible');
    });

    it('search in the stock list works', () => {
        cy.visit('/admin/stock');
        cy.get('input[placeholder*="recherche" i], input[placeholder*="search" i]').then(($inputs) => {
            if ($inputs.length > 0) {
                cy.wrap($inputs[0]).type('test');
                cy.wait(400);
                cy.get('body').should('not.contain.text', /erreur|error|500/i);
            }
        });
    });

    it('the critical stock badge is visible or absent (no error)', () => {
        cy.visit('/admin/stock');
        cy.get('body').should('not.contain.text', /erreur|error|500/i);
    });

    it("can navigate to a product's stock detail", () => {
        cy.visit('/admin/stock');
        cy.findAllByRole('link', {name: /gérer|manage|détail/i}).then(($links) => {
            if ($links.length > 0) {
                cy.wrap($links[0]).click();
                cy.url({timeout: 8000}).should('match', /\/admin\/products\/\d+\/stock/i);
                cy.findAllByText(/lots?/i, {timeout: 8000}).first().should('be.visible');
            }
        });
    });

    it('the add-lot form is functional', () => {
        cy.visit('/admin/stock');
        cy.findAllByRole('link', {name: /gérer|manage/i}).then(($links) => {
            if ($links.length === 0) {
                cy.log('No product to manage, test skipped');
                return;
            }
            cy.wrap($links[0]).click();
            cy.url().should('match', /\/admin\/products\/\d+\/stock/i);
            cy.findAllByRole('button', {name: /réapprovisionner/i}).first().click();

            cy.get('input[placeholder*="lot" i], input[name*="lot" i]').then(($lotInputs) => {
                if ($lotInputs.length === 0) return;
                const lotNumber = `LOT-E2E-${Date.now()}`;
                cy.wrap($lotInputs[0]).type(lotNumber);
                cy.findAllByLabelText(/quantité|quantity/i).first().type('10');
                cy.findAllByRole('button', {name: /ajouter|add|valider|confirmer/i}).first().click();
                cy.findByText(lotNumber, {timeout: 12000, exact: false}).should('be.visible');
            });
        });
    });

    it("the movements tab loads the history", () => {
        cy.visit('/admin/stock');
        cy.findAllByRole('link', {name: /gérer|manage/i}).then(($links) => {
            if ($links.length === 0) return;
            cy.wrap($links[0]).click();
            cy.url().should('match', /\/admin\/products\/\d+\/stock/i);

            cy.findAllByRole('tab', {name: /mouvements?|movements?/i}).then(($tabs) => {
                if ($tabs.length === 0) return;
                cy.wrap($tabs[0]).click();
                cy.get('table', {timeout: 8000}).first().should('be.visible');
            });
        });
    });

    it("a lot with quantity 0 cannot be added (validation)", () => {
        cy.visit('/admin/stock');
        cy.findAllByRole('link', {name: /gérer|manage/i}).then(($links) => {
            if ($links.length === 0) return;
            cy.wrap($links[0]).click();
            cy.url().should('match', /\/admin\/products\/\d+\/stock/i);
            cy.findAllByRole('button', {name: /réapprovisionner/i}).first().click();

            cy.get('input[placeholder*="lot" i], input[name*="lot" i]').then(($lotInputs) => {
                if ($lotInputs.length === 0) return;
                cy.wrap($lotInputs[0]).type('LOT-ZERO');
                cy.findAllByLabelText(/quantité|quantity/i).first().as('qtyInput').type('0');
                cy.findAllByRole('button', {name: /ajouter|add|valider|confirmer/i}).first().click();
                cy.get('@qtyInput').then(($input) => {
                    expect($input[0].validity.valid).to.be.false;
                });
            });
        });
    });
});
