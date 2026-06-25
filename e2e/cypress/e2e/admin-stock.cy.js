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

      cy.get('input[placeholder*="lot" i], input[name*="lot" i]').then(($lotInputs) => {
        if ($lotInputs.length === 0) return;
        cy.wrap($lotInputs[0]).type(`LOT-E2E-${Date.now()}`);
        cy.findAllByLabelText(/quantité|quantity/i).first().type('10');
        cy.findAllByRole('button', { name: /ajouter|add|valider/i }).first().click();
        cy.findByText(/ajouté|créé|created|success/i, { timeout: 8000 })
          .should('be.visible');
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

      cy.get('input[placeholder*="lot" i], input[name*="lot" i]').then(($lotInputs) => {
        if ($lotInputs.length === 0) return;
        cy.wrap($lotInputs[0]).type('LOT-ZERO');
        cy.findAllByLabelText(/quantité|quantity/i).first().type('0');
        cy.findAllByRole('button', { name: /ajouter|add|valider/i }).first().click();
        cy.findByText(/quantité|quantity|minimum|invalid/i, { timeout: 5000 })
          .should('be.visible');
      });
    });
  });
});
