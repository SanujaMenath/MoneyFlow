import { Page } from "@playwright/test";

export const TEST_EMAIL = process.env.TEST_EMAIL || "test@moneyflow.e2e";
export const TEST_PASSWORD = process.env.TEST_PASSWORD || "TestPassword123!";
export const TEST_BASE_URL = process.env.BASE_URL || "http://localhost:4173";

export async function login(page: Page, email?: string, password?: string) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[placeholder*="sanuja@example.com"]');
  await emailInput.waitFor({ state: "visible", timeout: 10000 });
  await emailInput.fill(email || TEST_EMAIL);

  const passwordInput = page.locator('input[placeholder*="secure password"]');
  await passwordInput.fill(password || TEST_PASSWORD);

  await page.locator("text=Sign In").click();
  await page.waitForURL(/.*dashboard.*|.*\/(\(tabs\))?$/, { timeout: 15000 });
}

export async function signOut(page: Page) {
  await page.goto("/settings");
  await page.waitForLoadState("networkidle");
  await page.locator("text=Sign Out").click();
  await page.waitForURL(/.*auth.*/, { timeout: 10000 });
}
