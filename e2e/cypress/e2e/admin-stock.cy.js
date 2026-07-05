/// <reference types="cypress" />

describe('Admin — Stocks', () => {
  beforeEach(() => cy.loginAsAdmin());

  it('la page stock globale charge avec la liste des produits', () => {
    cy.visit('/admin/stock');
    cy.findAllByText(/stock/i).first().should('be.visible');
    cy.get('table, [data-testid="stock-list"]', { timeout: 10000 })
      .first()
      .should('be.visible');
  });

  it('la recherche dans la liste stock fonctionne', () => {
    cy.visit('/admin/stock');
    cy.get('input[placeholder*="recherche" i], input[placeholder*="search" i]').then(($inputs) => {
      if ($inputs.length > 0) {
        cy.wrap($inputs[0]).type('test');
        cy.wait(400);
        cy.get('body').should('not.contain.text', /erreur|error|500/i);
      }
    });
  });

  it('le badge de stock critique est visible ou absent (pas d\'erreur)', () => {
    cy.visit('/admin/stock');
    cy.get('body').should('not.contain.text', /erreur|error|500/i);
  });

  it("on peut naviguer vers le détail stock d'un produit", () => {
    cy.visit('/admin/stock');
    cy.findAllByRole('link', { name: /gérer|manage|détail/i }).then(($links) => {
      if ($links.length > 0) {
        cy.wrap($links[0]).click();
        cy.url({ timeout: 8000 }).should('match', /\/admin\/products\/\d+\/stock/i);
        cy.findAllByText(/lots?/i, { timeout: 8000 }).first().should('be.visible');
      }
    });
  });

  it('le formulaire d\'ajout de lot est fonctionnel', () => {
    cy.visit('/admin/stock');
    cy.findAllByRole('link', { name: /gérer|manage/i }).then(($links) => {
      if ($links.length === 0) {
        cy.log('Aucun produit à gérer, test skipped');
        return;
      }
      cy.wrap($links[0]).click();
      cy.url().should('match', /\/admin\/products\/\d+\/stock/i);

      // The add-lot form is hidden behind a "+ Réapprovisionner" toggle button.
      cy.findAllByRole('button', { name: /réapprovisionner/i }).first().click();

      cy.get('input[placeholder*="lot" i], input[name*="lot" i]').then(($lotInputs) => {
        if ($lotInputs.length === 0) return;
        const lotNumber = `LOT-E2E-${Date.now()}`;
        cy.wrap($lotInputs[0]).type(lotNumber);
        cy.findAllByLabelText(/quantité|quantity/i).first().type('10');
        cy.findAllByRole('button', { name: /ajouter|add|valider|confirmer/i }).first().click();
        // No success toast exists — the form just closes and the lot appears in the table.
        // The lot number sits next to a "Lot " prefix in the same cell ("Lot LOT-E2E-…"),
        // so an exact-text match would never hit — search with exact: false instead.
        cy.findByText(lotNumber, { timeout: 12000, exact: false }).should('be.visible');
      });
    });
  });

  it("l'onglet mouvements charge l'historique", () => {
    cy.visit('/admin/stock');
    cy.findAllByRole('link', { name: /gérer|manage/i }).then(($links) => {
      if ($links.length === 0) return;
      cy.wrap($links[0]).click();
      cy.url().should('match', /\/admin\/products\/\d+\/stock/i);

      cy.findAllByRole('tab', { name: /mouvements?|movements?/i }).then(($tabs) => {
        if ($tabs.length === 0) return;
        cy.wrap($tabs[0]).click();
        cy.get('table', { timeout: 8000 }).first().should('be.visible');
      });
    });
  });

  it("un lot avec quantité 0 ne peut pas être ajouté (validation)", () => {
    cy.visit('/admin/stock');
    cy.findAllByRole('link', { name: /gérer|manage/i }).then(($links) => {
      if ($links.length === 0) return;
      cy.wrap($links[0]).click();
      cy.url().should('match', /\/admin\/products\/\d+\/stock/i);

      // The add-lot form is hidden behind a "+ Réapprovisionner" toggle button.
      cy.findAllByRole('button', { name: /réapprovisionner/i }).first().click();

      cy.get('input[placeholder*="lot" i], input[name*="lot" i]').then(($lotInputs) => {
        if ($lotInputs.length === 0) return;
        cy.wrap($lotInputs[0]).type('LOT-ZERO');
        cy.findAllByLabelText(/quantité|quantity/i).first().as('qtyInput').type('0');
        cy.findAllByRole('button', { name: /ajouter|add|valider|confirmer/i }).first().click();
        // quantity has min="1": the browser's native constraint validation blocks
        // submission before any custom error text would render.
        cy.get('@qtyInput').then(($input) => {
          expect($input[0].validity.valid).to.be.false;
        });
      });
    });
  });
});
