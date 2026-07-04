import { test, expect } from "@playwright/test";
import { login, signOut, TEST_EMAIL, TEST_PASSWORD } from "./helpers";

test.describe("Auth flows", () => {
  test("shows login form on first visit", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=MoneyFlow")).toBeVisible();
    await expect(page.locator("text=Sign In")).toBeVisible();
    await expect(page.locator("text=Email Address")).toBeVisible();
    await expect(page.locator("text=Password")).toBeVisible();
  });

  test("signs in with valid credentials", async ({ page }) => {
    await login(page);
    const dashboard = page.locator("text=Dashboard");
    await expect(dashboard).toBeVisible({ timeout: 10000 });
  });

  test("shows error for invalid credentials", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.locator('input[placeholder*="sanuja@example.com"]').fill("invalid@test.com");
    await page.locator('input[placeholder*="secure password"]').fill("wrongpassword");
    await page.locator("text=Sign In").click();

    await expect(page.locator("text=Invalid login credentials")).toBeVisible({ timeout: 10000 });
  });

  test("signs out successfully", async ({ page }) => {
    await login(page);
    await signOut(page);

    await expect(page.locator("text=Sign In")).toBeVisible({ timeout: 10000 });
  });

  test("toggles between sign up and sign in", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.locator("text=Don't have an account?").click();
    await expect(page.locator("text=Sign Up")).toBeVisible();

    await page.locator("text=Already have an account?").click();
    await expect(page.locator("text=Sign In")).toBeVisible();
  });
});
