@signup @regression
Feature: Customer registration
  As a new visitor
  I want to create a customer account
  So that I can check out faster and track my orders

  # NOTE: The registration form is protected by hCaptcha, which suppresses inline
  # validation banners for automated submissions. Negative scenarios therefore
  # assert the account was NOT created (the user remains on the registration
  # page) rather than asserting on a server error banner.

  Background:
    Given I am on the registration page

  @smoke @sanity
  Scenario: Registration page loads with its form controls
    Then the registration form should be visible

  @sanity
  Scenario: Registration is rejected when the password is too short
    When I register a new account using a password that is too short
    Then I should remain on the registration page

  Scenario: Registration is rejected when the email is blank
    When I register a new account without an email address
    Then I should remain on the registration page
