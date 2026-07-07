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
//
// Wrapped in cy.session(): /api/login is throttled server-side (10 req/min,
// intentional brute-force protection, see routes/api.php). Every test used to
// call this fresh, which alone exceeds the throttle across a full run and
// makes admin/admin-stock specs fail with 429s that have nothing to do with
// the app. cy.session() performs the real login once per credential set and
// restores the cached localStorage on every later call instead.
//
// `validate` matters here specifically because of auth.cy.js's "déconnexion"
// test: it exercises the real logout button, which revokes the token
// server-side (LogoutController). That's the same token cached under the
// 'user' session key — without validation, cy.session() would keep handing
// out that now-dead token to every test running after it, which then get a
// 401 on /api/me and silently bounce to /login. Validating against /api/me
// makes cy.session() notice and transparently re-authenticate instead.
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
