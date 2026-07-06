// @ts-check

/**
 * Centralised test data. Keeping data out of step definitions makes scenarios
 * easy to retarget across environments and avoids magic strings in code.
 */

let counter = 0;

/** @returns {string} a unique, well-formed email for fresh-registration cases. */
function uniqueEmail() {
  counter += 1;
  return `qa.automation+${Date.now()}_${counter}@example.com`;
}

const testData = {
  uniqueEmail,

  /** A valid-format account that does not exist on the store. */
  unknownUser: {
    email: 'no-such-user@example.com',
    password: 'WrongPass123!',
  },

  /** Base profile for registration scenarios. */
  newCustomer() {
    return {
      firstName: 'Test',
      lastName: 'Automation',
      email: uniqueEmail(),
      password: 'ValidPass123!',
    };
  },

  /** A password shorter than Shopify's 5-character minimum. */
  shortPassword: '123',
};

module.exports = testData;
