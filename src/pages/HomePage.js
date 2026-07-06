// @ts-check
const BasePage = require('./BasePage');

/**
 * HomePage — the storefront landing page of sauce-demo.myshopify.com.
 * Verifies primary navigation (login/register links, search, cart) and that
 * featured products render.
 */
class HomePage extends BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    super(page, 'HomePage');
  }

  /** @type {Record<string, import('../core/SelfHealingLocator').ElementDefinition>} */
  static elements = {
    loginLink: {
      name: 'Header login link',
      description: 'Header navigation link that goes to the customer login page (/account/login)',
      locators: [
        { by: 'id', value: 'customer_login_link' },
        { by: 'css', value: 'a[href="/account/login"]' },
        { by: 'role', value: 'link', options: { name: /login/i } },
      ],
    },
    registerLink: {
      name: 'Header register link',
      description: 'Header navigation link that goes to the customer registration page (/account/register)',
      locators: [
        { by: 'id', value: 'customer_register_link' },
        { by: 'css', value: 'a[href="/account/register"]' },
        { by: 'role', value: 'link', options: { name: /create|register|sign up/i } },
      ],
    },
    searchField: {
      name: 'Search field',
      description: 'Storefront search text input in the header',
      locators: [
        { by: 'id', value: 'search-field' },
        { by: 'css', value: 'input[name="q"]' },
        { by: 'placeholder', value: 'Search' },
      ],
    },
    cartLink: {
      name: 'Cart link',
      description: 'Header link/icon that opens the shopping cart',
      locators: [
        { by: 'css', value: 'a[href="/cart"]' },
        { by: 'css', value: '.cart' },
        { by: 'role', value: 'link', options: { name: /cart/i } },
      ],
    },
    firstProduct: {
      name: 'First featured product',
      description: 'The first featured product card/link on the home page grid',
      locators: [
        { by: 'id', value: 'product-1' },
        { by: 'css', value: '[id^="product-"]' },
        { by: 'css', value: 'a[href*="/products/"]' },
      ],
    },
  };

  /** Open the storefront home page. */
  async open() {
    await this.goto('/');
  }

  async clickLogin() {
    await this.click(HomePage.elements.loginLink);
  }

  async clickRegister() {
    await this.click(HomePage.elements.registerLink);
  }

  /** @returns {Promise<boolean>} */
  async isLoaded() {
    return (await this.isVisible(HomePage.elements.searchField)) &&
      (await this.isVisible(HomePage.elements.firstProduct));
  }

  /** @returns {Promise<boolean>} */
  async hasProducts() {
    return this.isVisible(HomePage.elements.firstProduct);
  }
}

module.exports = HomePage;
