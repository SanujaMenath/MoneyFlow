import { Page, expect } from "@playwright/test";

export const TEST_EMAIL = process.env.E2E_TEST_EMAIL || "test@moneyflow.example.com";
export const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || "TestPassword123!";
export const TEST_USER_ID = process.env.E2E_TEST_USER_ID || "";
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

export async function signIn(page: Page) {
  await page.goto(`${BASE_URL}/auth`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.getByPlaceholder("e.g. sanuja@example.com");
  const passwordInput = page.getByPlaceholder("Your secure password");
  const signInButton = page.locator("text=Sign In").last();

  await emailInput.fill(TEST_EMAIL);
  await passwordInput.fill(TEST_PASSWORD);
  await signInButton.click();

  await page.waitForURL("**/");
}

export async function signUp(page: Page) {
  await page.goto(`${BASE_URL}/auth`);
  await page.waitForLoadState("networkidle");

  const goToSignUp = page.locator("text=Don't have an account? Sign Up");
  if (await goToSignUp.isVisible()) {
    await goToSignUp.click();
  }

  const emailInput = page.getByPlaceholder("e.g. sanuja@example.com");
  const passwordInput = page.getByPlaceholder("Your secure password");
  const signUpButton = page.locator("text=Sign Up").last();

  await emailInput.fill(TEST_EMAIL);
  await passwordInput.fill(TEST_PASSWORD);
  await signUpButton.click();
}

export async function signOut(page: Page) {
  await page.goto(`${BASE_URL}/settings`);
  await page.waitForLoadState("networkidle");
  await page.locator("text=Sign Out").click();
  await page.waitForURL("**/auth");
}

export async function addTransaction(
  page: Page,
  opts: {
    type: "income" | "expense";
    amount: string;
    category: string;
    description?: string;
    recurring?: string;
  }
) {
  await page.goto(`${BASE_URL}/add`);
  await page.waitForLoadState("networkidle");

  if (opts.type === "income") {
    await page.locator("text=Income").click();
  } else {
    await page.locator("text=Expense").click();
  }

  await page.getByPlaceholder("0.00").fill(opts.amount);

  if (opts.description) {
    await page.getByPlaceholder("e.g. Grocery shopping").fill(opts.description);
  }

  await page.locator(`text=${opts.category}`).first().click();

  await page.locator("text=Save Transaction").click();
  await page.waitForTimeout(2000);
}

export function generateUniqueEmail(): string {
  const ts = Date.now();
  return `test-${ts}@moneyflow.example.com`;
}
