/// <reference types="cypress" />

describe('Purchase journey', () => {
    it('browses a product, adds it to the cart, and reaches the Stripe payment step', () => {
        cy.loginAsUser();

        cy.request('/api/products?per_page=50').then(({body}) => {
            const product = body.data[0];
            expect(product, 'a product exists').to.exist;
            cy.visit(`/products/${product.slug}`);

            cy.get('body').then(($body) => {
                const opt = $body.find('.pd-size:not([disabled])').first();
                if (opt.length) cy.wrap(opt).click();
            });

            cy.findByRole('button', {name: /ajouter au panier/i}).click();
        });

        cy.visit('/checkout');
        cy.get('#email').clear().type('e2e-purchase@gauthierfitness.fr');
        cy.get('#firstname').clear().type('Test');
        cy.get('#lastname').clear().type('E2E');
        cy.get('#address').clear().type('12 Rue de la Paix');
        cy.get('#zip').clear().type('75002');
        cy.get('#city').clear().type('Paris');
        cy.findByRole('button', {name: /continuer vers le paiement/i}).click();

        cy.get('.ck-payment-element iframe[name^="__privateStripeFrame"]', {timeout: 15000})
            .should('exist');
        cy.findByRole('button', {name: /payer maintenant/i}).should('be.visible').and('not.be.disabled');
    });
});

describe('Guest purchase journey', () => {
    it('allows completing a purchase without being logged in, with an option to log in at checkout', () => {

        cy.request('/api/products?per_page=50').then(({body}) => {
            const product = body.data[0];
            expect(product, 'a product exists').to.exist;
            cy.visit(`/products/${product.slug}`);

            cy.get('body').then(($body) => {
                const opt = $body.find('.pd-size:not([disabled])').first();
                if (opt.length) cy.wrap(opt).click();
            });

            cy.findByRole('button', {name: /ajouter au panier/i}).click();
        });

        cy.visit('/checkout');
        cy.location('pathname').should('eq', '/checkout');
        cy.findByRole('link', {name: /se connecter/i}).should('be.visible');
        cy.get('#email').clear().type('e2e-guest@gauthierfitness.fr');
        cy.get('#firstname').clear().type('Invité');
        cy.get('#lastname').clear().type('E2E');
        cy.get('#address').clear().type('12 Rue de la Paix');
        cy.get('#zip').clear().type('75002');
        cy.get('#city').clear().type('Paris');
        cy.findByRole('button', {name: /continuer vers le paiement/i}).click();

        cy.get('.ck-payment-element iframe[name^="__privateStripeFrame"]', {timeout: 15000})
            .should('exist');
        cy.findByRole('button', {name: /payer maintenant/i}).should('be.visible').and('not.be.disabled');
    });
});

describe('Product customization', () => {
    it('the customization page loads correctly for a customizable product', () => {
        cy.loginAsUser();

        cy.request('/api/products?per_page=200').then(({body}) => {
            const product = body.data.find((p) => p.is_customizable);
            expect(product, 'un produit personnalisable existe').to.exist;
            cy.visit(`/products/${product.slug}/customize`);
            cy.get('h1.pc-title', {timeout: 10000}).should('contain.text', product.name);
            cy.get('canvas', {timeout: 10000}).should('exist');
        });
    });
});
