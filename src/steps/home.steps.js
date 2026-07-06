// @ts-check
const { expect } = require('@playwright/test');
const { Given, When, Then } = require('../fixtures/fixtures');
const HomePage = require('../pages/HomePage');

Given('I am on the home page', async ({ homePage }) => {
  await homePage.open();
});

Then('the home page should be loaded', async ({ homePage }) => {
  expect(await homePage.isLoaded()).toBeTruthy();
});

Then('featured products should be visible', async ({ homePage }) => {
  expect(await homePage.hasProducts()).toBeTruthy();
});

Then('the search field should be visible', async ({ homePage }) => {
  await homePage.expectVisible(HomePage.elements.searchField);
});

Then('the cart link should be visible', async ({ homePage }) => {
  await homePage.expectVisible(HomePage.elements.cartLink);
});

Then('the login link should be visible', async ({ homePage }) => {
  await homePage.expectVisible(HomePage.elements.loginLink);
});

Then('the register link should be visible', async ({ homePage }) => {
  await homePage.expectVisible(HomePage.elements.registerLink);
});

When('I click the login link', async ({ homePage }) => {
  await homePage.clickLogin();
});

When('I click the register link', async ({ homePage }) => {
  await homePage.clickRegister();
});

Then('I should be on the login page', async ({ page }) => {
  await expect(page).toHaveURL(/\/account\/login/);
});

Then('I should be on the registration page', async ({ page }) => {
  await expect(page).toHaveURL(/\/account\/register/);
});
