import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("displays dashboard with key elements", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Total Balance")).toBeVisible();
    await expect(page.locator("text=Income")).toBeVisible();
    await expect(page.locator("text=Expenses")).toBeVisible();
    await expect(page.locator("text=Income vs Expenses")).toBeVisible();
  });

  test("shows financial health score", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Financial Health Score")).toBeVisible();
  });

  test("shows AI Insight card", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=AI Insight")).toBeVisible();
  });

  test("shows View All Transactions link", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const viewAll = page.locator("text=View All Transactions");
    await expect(viewAll).toBeVisible();

    await viewAll.click();
    await expect(page).toHaveURL(/.*transactions.*/);
  });

  test("displays balance with correct format", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const balanceText = page.locator('[class*="balanceText"]');
    await expect(balanceText).toBeVisible();
    const text = await balanceText.textContent();
    expect(text).toMatch(/^[+-]?[\d,]+\.?\d*$/);
  });
});
