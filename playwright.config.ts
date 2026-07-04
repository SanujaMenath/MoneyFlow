import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4173;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["html", { outputFolder: "e2e-report" }], ["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: `npx serve mobile/.expo-export-web -p ${PORT} --no-clipboard --single`,
      port: PORT,
      reuseExistingServer: !process.env.CI,
      cwd: ".",
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
