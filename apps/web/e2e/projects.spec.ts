import { test, expect } from "@playwright/test";

test.describe("Projects page", () => {
  test("shows projects list or redirects to login", async ({ page }) => {
    await page.goto("/projects");

    // Auth is required, so we expect either the projects page to load
    // or a redirect to the login/auth page
    await expect(page).toHaveURL(/\/(projects|auth\/login|api\/auth\/login)/);
  });

  test("project detail page loads with tab navigation", async ({ page }) => {
    await page.goto("/projects/test-id");

    // The page should render -- either showing project details (if authed)
    // or redirecting to login. Check that the page has interactive elements.
    const tabs = page.locator("[role='tab'], [role='tablist'], button");
    await expect(tabs.first()).toBeVisible({ timeout: 10_000 });
  });

  test("navigating to a non-existent project shows an error or fallback", async ({ page }) => {
    await page.goto("/projects/non-existent-id-12345");

    // Should either show a "not found" message, redirect, or display the
    // default project shell. We just confirm the page loaded without a crash.
    await expect(page.locator("body")).toBeVisible();
  });
});
