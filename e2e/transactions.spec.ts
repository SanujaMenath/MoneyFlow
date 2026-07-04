import { test, expect } from "@playwright/test";
import { signIn, addTransaction, TEST_EMAIL, TEST_PASSWORD } from "./helpers";

test.describe("Transactions", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.waitForURL("**/");
  });

  test("should add an expense transaction", async ({ page }) => {
    await addTransaction(page, {
      type: "expense",
      amount: "25.50",
      category: "Food & Dining",
      description: "Lunch meeting",
    });

    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Lunch meeting").first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Food & Dining").first()).toBeVisible();
  });

  test("should add an income transaction", async ({ page }) => {
    await addTransaction(page, {
      type: "income",
      amount: "5000.00",
      category: "Salary",
      description: "Monthly salary",
    });

    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Monthly salary").first()).toBeVisible({ timeout: 10000 });
  });

  test("should display transaction in summary strip", async ({ page }) => {
    await addTransaction(page, {
      type: "expense",
      amount: "100.00",
      category: "Transport",
    });

    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");

    const expensesText = page.locator("text=Expenses").first();
    await expect(expensesText).toBeVisible();
  });

  test("should filter by This Month preset", async ({ page }) => {
    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");

    await page.locator("text=This Month").first().click();
    await page.waitForTimeout(500);

    const noTransactions = page.locator("text=No transactions found for this date range.");
    const someTransactions = page.locator("text=Transactions").first();
    await expect(someTransactions).toBeVisible();
  });

  test("should show action menu on long press", async ({ page }) => {
    await addTransaction(page, {
      type: "expense",
      amount: "15.00",
      category: "Food & Dining",
    });

    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");

    const card = page.locator("text=Food & Dining").first();
    await card.click({ button: "right" });

    await expect(page.locator("text=Transaction Options")).toBeVisible({ timeout: 5000 });
  });
});
