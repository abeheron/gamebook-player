import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  testIgnore: process.env.DEMO_CURSOR === "1" ? undefined : ["**/p23b-record.spec.ts", "**/p16-record.spec.ts", "**/p11-record.spec.ts"],
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    serviceWorkers: "allow",
  },
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
