@login @regression
Feature: Customer login
  As a returning customer
  I want to sign in to my account
  So that I can access my order history and details

  # NOTE: The storefront login form is protected by hCaptcha, which suppresses
  # the classic "Incorrect email or password" banner for automated submissions.
  # Negative scenarios therefore assert the user is NOT authenticated (they
  # remain on the login page) rather than asserting on a server error banner.

  Background:
    Given I am on the login page

  @smoke @sanity
  Scenario: Login page loads with its form controls
    Then the login form should be visible

  @sanity
  Scenario: Login is rejected with invalid credentials
    When I log in with email "no-such-user@example.com" and password "WrongPass123!"
    Then I should remain on the login page

  Scenario Outline: Login is rejected for unknown accounts
    When I log in with email "<email>" and password "<password>"
    Then I should remain on the login page

    Examples:
      | email                        | password      |
      | ghost-account@example.com    | SomePass123!  |
      | not-registered@example.org   | AnotherP@ss1  |
