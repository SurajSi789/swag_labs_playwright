// @ts-check
const BasePage = require('./BasePage');

/**
 * RegisterPage — customer sign-up page at /account/register.
 */
class RegisterPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page, 'RegisterPage');
  }

  /** @type {Record<string, import('../core/SelfHealingLocator').ElementDefinition>} */
  static elements = {
    firstNameInput: {
      name: 'First name input',
      description: 'First name text box on the customer registration form',
      locators: [
        { by: 'css', value: '#create_customer input[name="customer[first_name]"]' },
        { by: 'css', value: 'input[name="customer[first_name]"]' },
        { by: 'css', value: '#create_customer #first_name' },
      ],
    },
    lastNameInput: {
      name: 'Last name input',
      description: 'Last name text box on the customer registration form',
      locators: [
        { by: 'css', value: '#create_customer input[name="customer[last_name]"]' },
        { by: 'css', value: 'input[name="customer[last_name]"]' },
        { by: 'css', value: '#create_customer #last_name' },
      ],
    },
    emailInput: {
      name: 'Register email input',
      description: 'Email address text box on the customer registration form',
      locators: [
        { by: 'css', value: '#create_customer input[name="customer[email]"]' },
        { by: 'css', value: 'input[name="customer[email]"]' },
        { by: 'css', value: '#create_customer input[type="email"]' },
      ],
    },
    passwordInput: {
      name: 'Register password input',
      description: 'Password text box on the customer registration form',
      locators: [
        { by: 'css', value: '#create_customer input[name="customer[password]"]' },
        { by: 'css', value: 'input[name="customer[password]"]' },
        { by: 'css', value: '#create_customer input[type="password"]' },
      ],
    },
    createButton: {
      name: 'Create account button',
      description: 'Submit button that creates the customer account ("Create")',
      locators: [
        { by: 'css', value: '#create_customer input[type="submit"]' },
        { by: 'css', value: 'input[value="Create"]' },
        { by: 'role', value: 'button', options: { name: /create/i } },
      ],
    },
    errorMessage: {
      name: 'Registration error message',
      description: 'Validation error banner shown after a failed registration',
      state: 'attached',
      locators: [
        { by: 'css', value: '.errors' },
        { by: 'css', value: '.form-message--error' },
        { by: 'css', value: '[class*="error"]' },
      ],
    },
  };

  /** Navigate directly to the registration page. */
  async open() {
    await this.goto('/account/register');
  }

  /**
   * @param {{ firstName: string, lastName: string, email: string, password: string }} data
   */
  async register({ firstName, lastName, email, password }) {
    await this.fill(RegisterPage.elements.firstNameInput, firstName);
    await this.fill(RegisterPage.elements.lastNameInput, lastName);
    await this.fill(RegisterPage.elements.emailInput, email);
    await this.fill(RegisterPage.elements.passwordInput, password);
    await this.click(RegisterPage.elements.createButton);
  }

  /** @returns {Promise<boolean>} */
  async isLoaded() {
    return this.isVisible(RegisterPage.elements.createButton);
  }

  /** @returns {Promise<boolean>} */
  async hasError() {
    return this.isVisible(RegisterPage.elements.errorMessage);
  }

  /** @returns {Promise<string>} */
  async errorText() {
    return this.text(RegisterPage.elements.errorMessage);
  }
}

module.exports = RegisterPage;
