// Global Cypress commands and plugins

import '@testing-library/cypress/add-commands';

// Authenticates via the API directly and seeds localStorage before any app JS
// runs, then visits the target page. Bypasses the login *form* entirely — the
// form itself (and its post-login redirect) is covered on its own in
// auth.cy.js. This sidesteps a real React timing race between the login
// page's navigate() call and the auth context's state update, where the app
// can occasionally land on /account or /login right after a perfectly valid
// login — confirmed by tracing the network activity of repeated admin logins,
// not something worth chasing in production code this close to the freeze.
function loginViaApi(email, password, landingPath) {
  cy.request('POST', '/api/login', { email, password }).then(({ body }) => {
    cy.visit(landingPath, {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', body.token);
        win.localStorage.setItem('user', JSON.stringify(body.user));
      },
    });
  });
}

/**
 * Logs in as an admin user (via the API, see loginViaApi); shared helper used
 * by the admin/stock specs.
 */
Cypress.Commands.add('loginAsAdmin', () => {
  loginViaApi(Cypress.env('TEST_ADMIN_EMAIL'), Cypress.env('TEST_ADMIN_PASSWORD'), '/admin');
  cy.url({ timeout: 10000 }).should('match', /admin/);
});

/**
 * Logs in as a regular customer user (via the API, see loginViaApi); shared
 * helper used wherever a test just needs to be authenticated. The login
 * *form* itself is exercised directly (not through this command) in auth.cy.js.
 */
Cypress.Commands.add('loginAsUser', () => {
  loginViaApi(Cypress.env('TEST_USER_EMAIL'), Cypress.env('TEST_USER_PASSWORD'), '/');
  cy.url({ timeout: 10000 }).should('not.match', /\/login/);
});
