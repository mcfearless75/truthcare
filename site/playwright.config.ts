import { defineConfig, devices } from "@playwright/test";

/**
 * Runs against the static export in `out/`, not the Next dev server — this is
 * what actually ships, and it is the only mode that exercises the real
 * hydration/keyboard behaviour the brief is worried about. `test:e2e` builds
 * first, so `webServer` only has to serve the already-built output.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx serve out -l 4173",
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
