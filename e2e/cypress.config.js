/**
 * GauthierFitness - Cypress configuration
 * E2E tests run
 */
const {defineConfig} = require('cypress');

module.exports = defineConfig({
    e2e: {
        baseUrl: process.env.BASE_URL || 'http://localhost',
        specPattern: 'cypress/e2e/**/*.cy.js',
        supportFile: 'cypress/support/e2e.js',
        fixturesFolder: 'cypress/fixtures',
        screenshotsFolder: 'cypress/screenshots',
        videosFolder: 'cypress/videos',
        video: true,
        videoCompression: 32,
        retries: {runMode: 2, openMode: 0},
        defaultCommandTimeout: 8000,
        pageLoadTimeout: 30000,
        viewportWidth: 1280,
        viewportHeight: 800,
        env: {
            TEST_USER_EMAIL: process.env.TEST_USER_EMAIL || 'test@gauthierfitness.fr',
            TEST_USER_PASSWORD: process.env.TEST_USER_PASSWORD || 'Password123!',
            TEST_ADMIN_EMAIL: process.env.TEST_ADMIN_EMAIL || 'admin@gauthierfitness.fr',
            TEST_ADMIN_PASSWORD: process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!',
        },
    },
});
