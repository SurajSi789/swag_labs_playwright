// @ts-check
const BasePage = require('./BasePage');

/**
 * LoginPage — customer sign-in page at /account/login.
 */
class LoginPage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page, 'LoginPage');
  }

  /** @type {Record<string, import('../core/SelfHealingLocator').ElementDefinition>} */
  static elements = {
    emailInput: {
      name: 'Login email input',
      description: 'Email address text box on the customer login form',
      locators: [
        { by: 'id', value: 'customer_email' },
        { by: 'css', value: 'input[name="customer[email]"]' },
        { by: 'css', value: '#customer_login input[type="email"]' },
      ],
    },
    passwordInput: {
      name: 'Login password input',
      description: 'Password text box on the customer login form',
      locators: [
        { by: 'id', value: 'customer_password' },
        { by: 'css', value: 'input[name="customer[password]"]' },
        { by: 'css', value: '#customer_login input[type="password"]' },
      ],
    },
    signInButton: {
      name: 'Sign In button',
      description: 'Submit button that logs the customer in ("Sign In")',
      locators: [
        { by: 'css', value: '#customer_login input[type="submit"]' },
        { by: 'css', value: 'input[value="Sign In"]' },
        { by: 'role', value: 'button', options: { name: /sign in/i } },
      ],
    },
    errorMessage: {
      name: 'Login error message',
      description: 'Validation / authentication error banner shown after a failed login',
      state: 'attached',
      locators: [
        { by: 'css', value: '.errors' },
        { by: 'css', value: '.form-message--error' },
        { by: 'css', value: '[class*="error"]' },
      ],
    },
  };

  /** Navigate directly to the login page. */
  async open() {
    await this.goto('/account/login');
  }

  /**
   * @param {string} email
   * @param {string} password
   */
  async login(email, password) {
    await this.fill(LoginPage.elements.emailInput, email);
    await this.fill(LoginPage.elements.passwordInput, password);
    await this.click(LoginPage.elements.signInButton);
  }

  /** @returns {Promise<boolean>} */
  async isLoaded() {
    return this.isVisible(LoginPage.elements.signInButton);
  }

  /** @returns {Promise<boolean>} */
  async hasError() {
    return this.isVisible(LoginPage.elements.errorMessage);
  }

  /** @returns {Promise<string>} */
  async errorText() {
    return this.text(LoginPage.elements.errorMessage);
  }
}

module.exports = LoginPage;
