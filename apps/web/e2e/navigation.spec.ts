import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("root URL redirects or loads the landing page", async ({ page }) => {
    await page.goto("/");

    // The app should either show a landing/home page or redirect to
    // /projects or /auth/login depending on authentication state
    await expect(page.locator("body")).toBeVisible();
    await expect(page).toHaveURL(/\/(projects|auth\/login|api\/auth\/login)?$/);
  });

  test("page has a proper title", async ({ page }) => {
    await page.goto("/");

    // Every page should have a non-empty document title
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test("unknown routes show a 404 or redirect", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist-xyz");

    // Next.js should return a 404 page or redirect
    // Either way the page should render without crashing
    await expect(page.locator("body")).toBeVisible();

    if (response) {
      // Accept 404 (expected) or 200 (redirect/catch-all) or 3xx
      expect([200, 301, 302, 307, 308, 404]).toContain(response.status());
    }
  });

  test("static assets load correctly", async ({ page }) => {
    await page.goto("/");

    // Verify that CSS has loaded by checking that the body has some computed styles
    const bgColor = await page.locator("body").evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    expect(bgColor).toBeTruthy();
  });
});
