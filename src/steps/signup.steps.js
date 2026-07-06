// @ts-check
const { expect } = require('@playwright/test');
const { Given, When, Then } = require('../fixtures/fixtures');
const testData = require('../data/testData');

Given('I am on the registration page', async ({ registerPage }) => {
  await registerPage.open();
});

Then('the registration form should be visible', async ({ registerPage }) => {
  expect(await registerPage.isLoaded()).toBeTruthy();
});

When(
  'I register a new account using a password that is too short',
  async ({ registerPage }) => {
    const customer = testData.newCustomer();
    await registerPage.register({ ...customer, password: testData.shortPassword });
  }
);

When('I register a new account without an email address', async ({ registerPage }) => {
  const customer = testData.newCustomer();
  await registerPage.register({ ...customer, email: '' });
});

Then('I should remain on the registration page', async ({ page, registerPage }) => {
  await expect(page).toHaveURL(/\/account\/register/);
  expect(await registerPage.isLoaded()).toBeTruthy();
});
