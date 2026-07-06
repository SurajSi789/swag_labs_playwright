// @ts-check
const { expect } = require('@playwright/test');
const { Given, When, Then } = require('../fixtures/fixtures');

Given('I am on the login page', async ({ loginPage }) => {
  await loginPage.open();
});

Then('the login form should be visible', async ({ loginPage }) => {
  expect(await loginPage.isLoaded()).toBeTruthy();
});

When(
  'I log in with email {string} and password {string}',
  async ({ loginPage }, email, password) => {
    await loginPage.login(email, password);
  }
);

Then('I should remain on the login page', async ({ page, loginPage }) => {
  await expect(page).toHaveURL(/\/account\/login/);
  expect(await loginPage.isLoaded()).toBeTruthy();
});
