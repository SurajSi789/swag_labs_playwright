// @ts-check
require('dotenv').config();
const { defineConfig, devices } = require('@playwright/test');
const { defineBddConfig } = require('playwright-bdd');

/**
 * playwright-bdd wires Gherkin `.feature` files to Playwright's runner.
 * `defineBddConfig` compiles features + step definitions into generated
 * spec files (`.features-gen/`) that Playwright then executes.
 */
const testDir = defineBddConfig({
  features: 'features/**/*.feature',
  steps: ['src/steps/**/*.js', 'src/fixtures/**/*.js'],
  // Generated runnable specs land under `tests/`, mirroring the per-area
  // sub-folders of `features/` (tests/home, tests/login, tests/signup).
  featuresRoot: 'features',
  outputDir: 'tests',
});

module.exports = defineConfig({
  testDir,
  /* Fail the build on CI if a `test.only` is committed. */
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60 * 1000,
  expect: { timeout: 10 * 1000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }],
    // Allure: raw results are written to allure-results/, then rendered into a
    // static site with `npm run allure:generate` (or the Allure Jenkins plugin).
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        detail: true,
        environmentInfo: {
          Application: 'sauce-demo.myshopify.com',
          Framework: 'Playwright + playwright-bdd',
          Node: process.version,
        },
      },
    ],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'https://sauce-demo.myshopify.com',
    headless: process.env.HEADLESS !== 'false',
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to broaden cross-browser coverage.
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit',  use: { ...devices['Desktop Safari'] } },
  ],
});
