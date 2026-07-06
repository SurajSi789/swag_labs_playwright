// @ts-check
const crypto = require('crypto');

/**
 * Centralised test data. Keeping data out of step definitions makes scenarios
 * easy to retarget across environments and avoids magic strings in code.
 *
 * NOTE: no credentials are hard-coded here. Passwords are generated at runtime
 * (so each run uses a fresh value) and can be overridden per environment via
 * the TEST_* environment variables — nothing sensitive lives in source control.
 */

let counter = 0;

/** @returns {string} a unique, well-formed email for fresh-registration cases. */
function uniqueEmail() {
  counter += 1;
  return `qa.automation+${Date.now()}_${counter}@example.com`;
}

/**
 * Generate a random password that satisfies typical complexity rules
 * (upper, lower, digit, symbol, length ≥ 12). Used for negative/registration
 * flows where the exact value is irrelevant — only its shape matters.
 * @returns {string}
 */
function randomPassword() {
  return `Aa1!${crypto.randomBytes(9).toString('base64url')}`;
}

const testData = {
  uniqueEmail,
  randomPassword,

  /** Base profile for registration scenarios. */
  newCustomer() {
    return {
      firstName: process.env.TEST_FIRST_NAME || 'Test',
      lastName: process.env.TEST_LAST_NAME || 'Automation',
      email: uniqueEmail(),
      password: process.env.TEST_PASSWORD || randomPassword(),
    };
  },

  /** A deliberately invalid value: shorter than Shopify's 5-character minimum. */
  shortPassword: process.env.TEST_SHORT_PASSWORD || '123',
};

module.exports = testData;
