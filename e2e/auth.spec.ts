import { test, expect } from "@playwright/test";
import { TEST_EMAIL, TEST_PASSWORD, signIn, signOut } from "./helpers";

test.describe("Authentication", () => {
  test("should sign in with valid credentials", async ({ page }) => {
    await signIn(page);

    await page.waitForURL("**/");

    const dashboardText = page.locator("text=Dashboard");
    await expect(dashboardText).toBeVisible();
  });

  test("should show error with wrong password", async ({ page }) => {
    await page.goto("/auth");
    await page.waitForLoadState("networkidle");

    await page.getByPlaceholder("e.g. sanuja@example.com").fill(TEST_EMAIL);
    await page.getByPlaceholder("Your secure password").fill("WrongPassword123!");
    await page.locator("text=Sign In").last().click();

    await expect(page.locator("text=Error")).toBeVisible({ timeout: 10000 });
  });

  test("should sign out and redirect to auth", async ({ page }) => {
    await signIn(page);
    await page.waitForURL("**/");

    await signOut(page);

    await page.waitForURL("**/auth");
    await expect(page.locator("text=MoneyFlow")).toBeVisible();
  });

  test("should show validation for empty fields", async ({ page }) => {
    await page.goto("/auth");
    await page.waitForLoadState("networkidle");

    await page.locator("text=Sign In").last().click();

    await expect(page.locator("text=Please fill in all fields")).toBeVisible();
  });

  test("should show validation for short password", async ({ page }) => {
    await page.goto("/auth");
    await page.waitForLoadState("networkidle");

    await page.getByPlaceholder("e.g. sanuja@example.com").fill("test@example.com");
    await page.getByPlaceholder("Your secure password").fill("123");
    await page.locator("text=Sign In").last().click();

    await expect(page.locator("text=Password must be at least 6 characters long.")).toBeVisible();
  });
});
