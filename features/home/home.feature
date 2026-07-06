@home @regression
Feature: Home page
  As a visitor
  I want the storefront home page to load correctly
  So that I can browse products and reach my account

  Background:
    Given I am on the home page

  @smoke @sanity
  Scenario: Home page loads with featured products
    Then the home page should be loaded
    And featured products should be visible

  @sanity
  Scenario: Header exposes the primary account and shopping controls
    Then the search field should be visible
    And the cart link should be visible
    And the login link should be visible
    And the register link should be visible

  @sanity
  Scenario: Navigate from home to the login page
    When I click the login link
    Then I should be on the login page

  Scenario: Navigate from home to the registration page
    When I click the register link
    Then I should be on the registration page
