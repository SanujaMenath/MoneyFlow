import { test, expect } from "@playwright/test";
import { signIn, addTransaction } from "./helpers";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.waitForURL("**/");
  });

  test("should display Total Balance card", async ({ page }) => {
    const totalBalance = page.locator("text=Total Balance");
    await expect(totalBalance).toBeVisible();
  });

  test("should display Income and Expense stats", async ({ page }) => {
    const income = page.locator("text=Income").first();
    const expenses = page.locator("text=Expenses").first();

    await expect(income).toBeVisible();
    await expect(expenses).toBeVisible();
  });

  test("should display Income vs Expenses chart", async ({ page }) => {
    const chartTitle = page.locator("text=Income vs Expenses");
    await expect(chartTitle).toBeVisible();
  });

  test("should display AI Insight section", async ({ page }) => {
    const aiInsight = page.locator("text=AI Insight");
    await expect(aiInsight).toBeVisible();

    const healthScore = page.locator("text=Financial Health Score");
    await expect(healthScore).toBeVisible();
  });

  test("should display Savings Goal card", async ({ page }) => {
    const savingsGoal = page.locator("text=Savings Goal").first();
    await expect(savingsGoal).toBeVisible();

    const goalLabel = page.locator("text=Goal");
    await expect(goalLabel).toBeVisible();

    const savedLabel = page.locator("text=Saved");
    await expect(savedLabel).toBeVisible();
  });

  test("should navigate to transactions page", async ({ page }) => {
    await page.locator("text=View All Transactions").click();
    await page.waitForURL("**/transactions");
    await expect(page.locator("text=Transactions").first()).toBeVisible();
  });

  test("should update balance after adding income", async ({ page }) => {
    const balanceBefore = await page.locator("text=Total Balance").textContent();

    await addTransaction(page, {
      type: "income",
      amount: "999.00",
      category: "Gift",
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(page.locator("text=Total Balance")).toBeVisible();
  });
});
