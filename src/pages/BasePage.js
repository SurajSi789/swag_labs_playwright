// @ts-check
const { expect } = require('@playwright/test');
const SelfHealingLocator = require('../core/SelfHealingLocator');

/**
 * BasePage
 * --------
 * Foundation for every page object. It owns the {@link SelfHealingLocator} and
 * exposes small, intention-revealing action helpers that all route through the
 * healing engine. Page objects should express *what* to do (fill email, click
 * sign in); *how* an element is found — and healed — lives here and in the core.
 */
class BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   * @param {string} pageName  Logical name used in logs & healing reports.
   */
  constructor(page, pageName) {
    this.page = page;
    this.pageName = pageName;
    this.healing = new SelfHealingLocator(page);
  }

  /**
   * Resolve an element definition into a healed, usable Locator.
   * @param {import('../core/SelfHealingLocator').ElementDefinition} def
   * @returns {Promise<import('@playwright/test').Locator>}
   */
  async $(def) {
    return this.healing.resolve(def, this.pageName);
  }

  /**
   * Navigate to a path relative to the configured baseURL.
   * @param {string} [path]
   */
  async goto(path = '/') {
    await this.page.goto(path, { waitUntil: 'domcontentloaded' });
  }

  /** @param {import('../core/SelfHealingLocator').ElementDefinition} def @param {string} value */
  async fill(def, value) {
    const locator = await this.$(def);
    await locator.fill(value);
  }

  /** @param {import('../core/SelfHealingLocator').ElementDefinition} def */
  async click(def) {
    const locator = await this.$(def);
    await locator.click();
  }

  /**
   * @param {import('../core/SelfHealingLocator').ElementDefinition} def
   * @returns {Promise<string>}
   */
  async text(def) {
    const locator = await this.$(def);
    return (await locator.textContent())?.trim() ?? '';
  }

  /**
   * @param {import('../core/SelfHealingLocator').ElementDefinition} def
   * @returns {Promise<boolean>}
   */
  async isVisible(def) {
    try {
      const locator = await this.$(def);
      return await locator.isVisible();
    } catch {
      return false;
    }
  }

  /** @param {import('../core/SelfHealingLocator').ElementDefinition} def */
  async expectVisible(def) {
    const locator = await this.$(def);
    await expect(locator).toBeVisible();
  }

  /** @returns {Promise<string>} the current page URL. */
  currentUrl() {
    return Promise.resolve(this.page.url());
  }

  /** @returns {Promise<string>} the document title. */
  title() {
    return this.page.title();
  }
}

module.exports = BasePage;
