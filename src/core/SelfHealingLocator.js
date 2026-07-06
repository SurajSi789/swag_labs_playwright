// @ts-check
const reporter = require('./HealingReporter');
const aiHealer = require('./AIHealer');

/**
 * @typedef {Object} LocatorStrategy
 * @property {'css'|'xpath'|'id'|'role'|'text'|'placeholder'|'label'|'testid'|'altText'} by
 * @property {string} value            Selector / role / text value.
 * @property {object} [options]        Extra options (e.g. { name } for role).
 */

/**
 * @typedef {Object} ElementDefinition
 * @property {string} name             Logical element name (for reports/logs).
 * @property {string} description      Plain-language description used by AI healing.
 * @property {LocatorStrategy[]} locators  Ordered candidate locators (primary first).
 * @property {'visible'|'attached'} [state]  Readiness state to consider a match. Default 'visible'.
 */

const CANDIDATE_TIMEOUT = Number(process.env.HEAL_CANDIDATE_TIMEOUT || 3500);

/**
 * SelfHealingLocator
 * ------------------
 * Wraps a Playwright `Page` and resolves an {@link ElementDefinition} into a
 * concrete, usable `Locator` using a layered strategy:
 *
 *   1. Try each static locator in order (primary → fallbacks).
 *   2. If all static locators fail and AI healing is enabled, ask an AI model
 *      to generate a fresh selector against the live DOM, then try that.
 *
 * Every recovery beyond the primary locator is recorded by the HealingReporter.
 */
class SelfHealingLocator {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
  }

  /**
   * Build a Playwright Locator from a single strategy definition.
   * @param {LocatorStrategy} strategy
   * @returns {import('@playwright/test').Locator}
   */
  _build(strategy) {
    const { by, value, options } = strategy;
    switch (by) {
      case 'css':
        return this.page.locator(value);
      case 'xpath':
        return this.page.locator(value.startsWith('xpath=') ? value : `xpath=${value}`);
      case 'id':
        return this.page.locator(`#${value}`);
      case 'role':
        // @ts-ignore - role validated by Playwright at runtime.
        return this.page.getByRole(value, options);
      case 'text':
        return this.page.getByText(value, options);
      case 'placeholder':
        return this.page.getByPlaceholder(value, options);
      case 'label':
        return this.page.getByLabel(value, options);
      case 'testid':
        return this.page.getByTestId(value);
      case 'altText':
        return this.page.getByAltText(value, options);
      default:
        throw new Error(`Unknown locator strategy "${by}" for value "${value}"`);
    }
  }

  /**
   * Human-readable string form of a strategy, used in logs and reports.
   * @param {LocatorStrategy} strategy
   * @returns {string}
   */
  _describe(strategy) {
    const opt =
      strategy.options && Object.keys(strategy.options).length
        ? ` ${JSON.stringify(strategy.options)}`
        : '';
    return `${strategy.by}=${strategy.value}${opt}`;
  }

  /**
   * Whether a locator currently resolves to at least one element in the
   * requested readiness state, within the candidate timeout.
   * @param {import('@playwright/test').Locator} locator
   * @param {'visible'|'attached'} state
   * @returns {Promise<boolean>}
   */
  async _isUsable(locator, state) {
    try {
      await locator.first().waitFor({ state, timeout: CANDIDATE_TIMEOUT });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolve an element definition into a usable Locator, healing if necessary.
   * @param {ElementDefinition} def
   * @param {string} pageName  Owning page object name (for reporting).
   * @returns {Promise<import('@playwright/test').Locator>}
   */
  async resolve(def, pageName = 'UnknownPage') {
    const state = def.state || 'visible';
    const [primary, ...fallbacks] = def.locators;
    const primaryStr = this._describe(primary);

    // 1. Primary locator — the happy path (no healing recorded).
    const primaryLocator = this._build(primary);
    if (await this._isUsable(primaryLocator, state)) {
      return primaryLocator.first();
    }

    // 2. Static fallback locators.
    const tried = [primaryStr];
    for (const fb of fallbacks) {
      const fbStr = this._describe(fb);
      const fbLocator = this._build(fb);
      if (await this._isUsable(fbLocator, state)) {
        reporter.record({
          timestamp: new Date().toISOString(),
          page: pageName,
          element: def.name,
          description: def.description,
          url: this.page.url(),
          strategy: 'fallback',
          failedPrimary: primaryStr,
          triedFallbacks: tried.slice(1),
          healedLocator: fbStr,
        });
        return fbLocator.first();
      }
      tried.push(fbStr);
    }

    // 3. AI healing — generate a brand-new selector from the live DOM.
    const ai = await aiHealer.heal(this.page, def);
    if (ai) {
      const aiLocator =
        ai.strategy === 'xpath'
          ? this.page.locator(`xpath=${ai.selector.replace(/^xpath=/, '')}`)
          : this.page.locator(ai.selector);

      if (await this._isUsable(aiLocator, state)) {
        reporter.record({
          timestamp: new Date().toISOString(),
          page: pageName,
          element: def.name,
          description: def.description,
          url: this.page.url(),
          strategy: 'ai',
          failedPrimary: primaryStr,
          triedFallbacks: tried.slice(1),
          healedLocator: `${ai.strategy}=${ai.selector}`,
          aiProvider: aiHealer.providerKey,
          aiModel: aiHealer.model,
        });
        return aiLocator.first();
      }
    }

    throw new Error(
      `Self-healing failed for "${def.name}" on ${pageName}. ` +
        `Tried: [${tried.join(' | ')}]` +
        (ai ? ` and AI selector "${ai.selector}"` : ' and AI healing was unavailable/failed') +
        `. Current URL: ${this.page.url()}`
    );
  }
}

module.exports = SelfHealingLocator;
