import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("i18n", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.waitForURL("**/");
  });

  test("should display dashboard in English by default", async ({ page }) => {
    await expect(page.locator("text=Dashboard")).toBeVisible();
    await expect(page.locator("text=Total Balance")).toBeVisible();
    await expect(page.locator("text=Income vs Expenses")).toBeVisible();
    await expect(page.locator("text=AI Insight")).toBeVisible();
    await expect(page.locator("text=Financial Health Score")).toBeVisible();
    await expect(page.locator("text=View All Transactions")).toBeVisible();
  });

  test("should display transaction screen in English", async ({ page }) => {
    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Transactions").first()).toBeVisible();
    await expect(page.locator("text=All Time")).toBeVisible();
    await expect(page.locator("text=This Month")).toBeVisible();
    await expect(page.locator("text=Last Month")).toBeVisible();
  });

  test("should display settings in English", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Settings")).toBeVisible();
    await expect(page.locator("text=Savings Goal")).toBeVisible();
    await expect(page.locator("text=Currency")).toBeVisible();
    await expect(page.locator("text=Sign Out")).toBeVisible();
  });

  test("should display add transaction in English", async ({ page }) => {
    await page.goto("/add");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=New Transaction")).toBeVisible();
    await expect(page.locator("text=Amount")).toBeVisible();
    await expect(page.locator("text=Category")).toBeVisible();
    await expect(page.locator("text=Date")).toBeVisible();
    await expect(page.locator("text=Recurring")).toBeVisible();
    await expect(page.locator("text=Save Transaction")).toBeVisible();
  });

  test("should display auth screen in English", async ({ page }) => {
    await page.goto("/auth");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=MoneyFlow")).toBeVisible();
    await expect(page.locator("text=Email Address")).toBeVisible();
    await expect(page.locator("text=Password")).toBeVisible();
    await expect(page.locator("text=Sign In")).toBeVisible();
  });

  test("should display analytics in English", async ({ page }) => {
    await page.goto("/analytics");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Analytics").first()).toBeVisible();
    await expect(page.locator("text=Expenses by Category")).toBeVisible();
    await expect(page.locator("text=Key Spending Insights")).toBeVisible();
    await expect(page.locator("text=Total Tracked Spend")).toBeVisible();
  });
});
