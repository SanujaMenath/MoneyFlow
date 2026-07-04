import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Transactions", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("opens add transaction form", async ({ page }) => {
    await page.goto("/add");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=New Transaction")).toBeVisible();
    await expect(page.locator("text=Amount")).toBeVisible();
    await expect(page.locator("text=Category")).toBeVisible();
    await expect(page.locator("text=Save Transaction")).toBeVisible();
  });

  test("adds an expense transaction", async ({ page }) => {
    await page.goto("/add");
    await page.waitForLoadState("networkidle");

    await page.locator('input[placeholder="0.00"]').fill("25.50");
    await page.locator("text=Food & Dining").click();
    await page.locator("text=Save Transaction").click();

    await expect(page.locator("text=Transaction recorded!")).toBeVisible({ timeout: 10000 });
  });

  test("adds an income transaction", async ({ page }) => {
    await page.goto("/add");
    await page.waitForLoadState("networkidle");

    await page.locator("text=Income").click();

    await page.locator('input[placeholder="0.00"]').fill("5000.00");
    await page.locator("text=Salary").click();
    await page.locator("text=Save Transaction").click();

    await expect(page.locator("text=Transaction recorded!")).toBeVisible({ timeout: 10000 });
  });

  test("shows validation error for zero amount", async ({ page }) => {
    await page.goto("/add");
    await page.waitForLoadState("networkidle");

    await page.locator('input[placeholder="0.00"]').fill("0");
    await page.locator("text=Save Transaction").click();

    await expect(
      page.locator("text=Please enter a valid amount greater than 0.")
    ).toBeVisible();
  });

  test("shows validation error without category", async ({ page }) => {
    await page.goto("/add");
    await page.waitForLoadState("networkidle");

    await page.locator('input[placeholder="0.00"]').fill("100");
    await page.locator("text=Save Transaction").click();

    await expect(page.locator("text=Please select a category.")).toBeVisible();
  });

  test("lists transactions on the transactions page", async ({ page }) => {
    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Transactions")).toBeVisible();
  });

  test("filters transactions by preset", async ({ page }) => {
    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");

    await page.locator("text=This Month").click();
    await page.waitForTimeout(500);

    await page.locator("text=All Time").click();
    await page.waitForTimeout(500);
  });

  test("deletes a transaction from action menu", async ({ page }) => {
    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");

    const firstCard = page.locator('[class*="card"]').first();
    await firstCard.waitFor({ state: "visible", timeout: 10000 });

    await firstCard.click({ button: "right" });
    await page.locator("text=Delete").first().click();

    await expect(page.locator("text=Are you sure?")).toBeVisible();
    await page.locator("text=Delete").last().click();
    await page.waitForTimeout(1000);
  });
});
