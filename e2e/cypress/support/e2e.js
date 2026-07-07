// Global Cypress commands and plugins

import '@testing-library/cypress/add-commands';

function loginViaApi(sessionKey, email, password, landingPath) {
  cy.session(sessionKey, () => {
    cy.request('POST', '/api/login', { email, password }).then(({ body }) => {
      cy.visit(landingPath, {
        onBeforeLoad(win) {
          win.localStorage.setItem('token', body.token);
          win.localStorage.setItem('user', JSON.stringify(body.user));
        },
      });
    });
  }, {
    cacheAcrossSpecs: true,
    validate() {
      cy.request({
        method: 'GET',
        url: '/api/me',
        headers: { Authorization: `Bearer ${window.localStorage.getItem('token')}` },
      });
    },
  });

  cy.visit(landingPath);
}

/**
 * Logs in as an admin user (via the API, see loginViaApi); shared helper used
 * by the admin/stock specs.
 */
Cypress.Commands.add('loginAsAdmin', () => {
  loginViaApi('admin', Cypress.env('TEST_ADMIN_EMAIL'), Cypress.env('TEST_ADMIN_PASSWORD'), '/admin');
  cy.url({ timeout: 10000 }).should('match', /admin/);
});

/**
 * Logs in as a regular customer user (via the API, see loginViaApi); shared
 * helper used wherever a test just needs to be authenticated. The login
 * *form* itself is exercised directly (not through this command) in auth.cy.js.
 */
Cypress.Commands.add('loginAsUser', () => {
  loginViaApi('user', Cypress.env('TEST_USER_EMAIL'), Cypress.env('TEST_USER_PASSWORD'), '/');
  cy.url({ timeout: 10000 }).should('not.match', /\/login/);
});
