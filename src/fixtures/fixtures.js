// @ts-check
const { test: base, createBdd } = require('playwright-bdd');
const HomePage = require('../pages/HomePage');
const LoginPage = require('../pages/LoginPage');
const RegisterPage = require('../pages/RegisterPage');

/**
 * Custom test-scoped fixtures layered on top of Playwright + playwright-bdd.
 * Each page object is exposed as a fixture so step definitions can request
 * exactly the pages they need. `world` is a per-scenario scratch bag for
 * passing values between steps (e.g. a generated email).
 *
 * The explicit `@typedef` + cast below are required: in plain JS, Playwright's
 * self-referential fixture argument prevents `base.extend` from inferring these
 * custom fixtures, which would make `homePage` & friends unknown to every step.
 *
 * All step definitions and hooks in this project MUST import { Given, When,
 * Then, ... } from THIS module so they share these fixtures.
 *
 * @typedef {object} PageFixtures
 * @property {InstanceType<typeof HomePage>} homePage
 * @property {InstanceType<typeof LoginPage>} loginPage
 * @property {InstanceType<typeof RegisterPage>} registerPage
 * @property {Record<string, any>} world
 */

const test = base.extend(
  /**
   * @type {import('@playwright/test').Fixtures<
   *   PageFixtures,
   *   {},
   *   import('@playwright/test').PlaywrightTestArgs &
   *     import('@playwright/test').PlaywrightTestOptions,
   *   import('@playwright/test').PlaywrightWorkerArgs &
   *     import('@playwright/test').PlaywrightWorkerOptions
   * >}
   */
  ({
    homePage: async ({ page }, use) => {
      await use(new HomePage(page));
    },
    loginPage: async ({ page }, use) => {
      await use(new LoginPage(page));
    },
    registerPage: async ({ page }, use) => {
      await use(new RegisterPage(page));
    },
    // Per-scenario shared state.
    world: async ({}, use) => {
      await use(/** @type {Record<string, any>} */ ({}));
    },
  })
);

const { Given, When, Then, Before, After, BeforeAll, AfterAll } = createBdd(test);

module.exports = { test, Given, When, Then, Before, After, BeforeAll, AfterAll };
