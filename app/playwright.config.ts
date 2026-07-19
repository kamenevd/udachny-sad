import { defineConfig, devices } from "@playwright/test";

/**
 * E2E-конфиг (задача 21.1).
 * Dev-сервер поднимается в режиме `--mode e2e`: convex/react и
 * @convex-dev/auth/react подменяются in-memory моками (см. e2e/mocks/),
 * поэтому тесты не требуют живого Convex-деплоя.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5175",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- --mode e2e --port 5175 --strictPort",
    url: "http://localhost:5175",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
