# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication >> should sign in with valid credentials
- Location: e2e\auth.spec.ts:5:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.screenshot: Target page, context or browser has been closed
```

# Page snapshot

```yaml
- generic [ref=e6]:
  - generic [ref=e7]:
    - generic [ref=e8]: MoneyFlow
    - generic [ref=e9]: Welcome back, let's manage your flow
  - generic [ref=e10]:
    - generic [ref=e11]: Email Address
    - textbox "e.g. sanuja@example.com" [ref=e12]: test@moneyflow.example.com
    - generic [ref=e13]: Password
    - generic [ref=e14]:
      - textbox "Your secure password" [ref=e15]: TestPassword123!
      - generic [ref=e17] [cursor=pointer]: 
    - generic [ref=e19] [cursor=pointer]: Sign In
    - generic [ref=e21] [cursor=pointer]: Don't have an account? Sign Up
```

# Test source

```ts
  1  | import { Page, expect } from "@playwright/test";
  2  | 
  3  | export const TEST_EMAIL = process.env.E2E_TEST_EMAIL || "test@moneyflow.example.com";
  4  | export const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || "TestPassword123!";
  5  | export const TEST_USER_ID = process.env.E2E_TEST_USER_ID || "";
  6  | const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
  7  | 
  8  | export async function signIn(page: Page) {
  9  |   await page.goto(`${BASE_URL}/auth`);
  10 |   await page.waitForLoadState("networkidle");
  11 | 
  12 |   const emailInput = page.getByPlaceholder("e.g. sanuja@example.com");
  13 |   const passwordInput = page.getByPlaceholder("Your secure password");
  14 |   const signInButton = page.locator("text=Sign In").last();
  15 | 
  16 |   await emailInput.fill(TEST_EMAIL);
  17 |   await passwordInput.fill(TEST_PASSWORD);
  18 |   await signInButton.click();
  19 | 
  20 |   try {
  21 |     await page.waitForURL("**/");
  22 |   } catch {
> 23 |     await page.screenshot({ path: "sign-in-failed.png" });
     |                ^ Error: page.screenshot: Target page, context or browser has been closed
  24 |     const text = await page.locator("text=Error").first().textContent({ timeout: 10000 }).catch(() => "no error shown");
  25 |     console.log(`Sign in failed. Error text: ${text}`);
  26 |     console.log(`Current URL: ${page.url()}`);
  27 |     throw new Error(`Sign in failed: ${text}`);
  28 |   }
  29 | }
  30 | 
  31 | export async function signUp(page: Page) {
  32 |   await page.goto(`${BASE_URL}/auth`);
  33 |   await page.waitForLoadState("networkidle");
  34 | 
  35 |   const goToSignUp = page.locator("text=Don't have an account? Sign Up");
  36 |   if (await goToSignUp.isVisible()) {
  37 |     await goToSignUp.click();
  38 |   }
  39 | 
  40 |   const emailInput = page.getByPlaceholder("e.g. sanuja@example.com");
  41 |   const passwordInput = page.getByPlaceholder("Your secure password");
  42 |   const signUpButton = page.locator("text=Sign Up").last();
  43 | 
  44 |   await emailInput.fill(TEST_EMAIL);
  45 |   await passwordInput.fill(TEST_PASSWORD);
  46 |   await signUpButton.click();
  47 | }
  48 | 
  49 | export async function signOut(page: Page) {
  50 |   await page.goto(`${BASE_URL}/settings`);
  51 |   await page.waitForLoadState("networkidle");
  52 |   await page.locator("text=Sign Out").click();
  53 |   await page.waitForURL("**/auth");
  54 | }
  55 | 
  56 | export async function addTransaction(
  57 |   page: Page,
  58 |   opts: {
  59 |     type: "income" | "expense";
  60 |     amount: string;
  61 |     category: string;
  62 |     description?: string;
  63 |     recurring?: string;
  64 |   }
  65 | ) {
  66 |   await page.goto(`${BASE_URL}/add`);
  67 |   await page.waitForLoadState("networkidle");
  68 | 
  69 |   if (opts.type === "income") {
  70 |     await page.locator("text=Income").click();
  71 |   } else {
  72 |     await page.locator("text=Expense").click();
  73 |   }
  74 | 
  75 |   await page.getByPlaceholder("0.00").fill(opts.amount);
  76 | 
  77 |   if (opts.description) {
  78 |     await page.getByPlaceholder("e.g. Grocery shopping").fill(opts.description);
  79 |   }
  80 | 
  81 |   await page.locator(`text=${opts.category}`).first().click();
  82 | 
  83 |   await page.locator("text=Save Transaction").click();
  84 |   await page.waitForTimeout(2000);
  85 | }
  86 | 
  87 | export function generateUniqueEmail(): string {
  88 |   const ts = Date.now();
  89 |   return `test-${ts}@moneyflow.example.com`;
  90 | }
  91 | 
```