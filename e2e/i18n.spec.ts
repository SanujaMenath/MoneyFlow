import { test, expect } from "@playwright/test";
import { login, signOut, TEST_EMAIL, TEST_PASSWORD } from "./helpers";

test.describe("i18n / Localization", () => {
  test("shows English text by default", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Email Address")).toBeVisible();
    await expect(page.locator("text=Password")).toBeVisible();
    await expect(page.locator("text=Sign In")).toBeVisible();
  });

  test("shows Sinhala text after language switch", async ({ page }) => {
    await login(page);

    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Currency")).toBeVisible();
    await expect(page.locator("text=Sign Out")).toBeVisible();
  });

  test("dashboard labels are in English (default)", async ({ page }) => {
    await login(page);

    await expect(page.locator("text=Dashboard")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Total Balance")).toBeVisible();
    await expect(page.locator("text=Income vs Expenses")).toBeVisible();
    await expect(page.locator("text=AI Insight")).toBeVisible();
    await expect(page.locator("text=Financial Health Score")).toBeVisible();
  });

  test("transactions page labels are in English", async ({ page }) => {
    await login(page);

    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Transactions")).toBeVisible();
    await expect(page.locator("text=All Time")).toBeVisible();
    await expect(page.locator("text=This Month")).toBeVisible();
    await expect(page.locator("text=Last Month")).toBeVisible();
  });

  test("analytics page labels are in English", async ({ page }) => {
    await login(page);

    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Analytics")).toBeVisible();
    await expect(page.locator("text=Expenses by Category")).toBeVisible();
    await expect(page.locator("text=Key Spending Insights")).toBeVisible();
  });

  test("add transaction page labels are in English", async ({ page }) => {
    await login(page);

    await page.goto("/add");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=New Transaction")).toBeVisible();
    await expect(page.locator("text=Expense")).toBeVisible();
    await expect(page.locator("text=Income")).toBeVisible();
    await expect(page.locator("text=Description")).toBeVisible();
    await expect(page.locator("text=Date")).toBeVisible();
    await expect(page.locator("text=Category")).toBeVisible();
    await expect(page.locator("text=Save Transaction")).toBeVisible();
  });
});
