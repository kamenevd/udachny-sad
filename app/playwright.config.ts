import { defineConfig, devices } from "@playwright/test";

/**
 * E2E-конфиг (задача 21.1; переработан в PLAN13).
 *
 * Тесты гоняются против НАСТОЯЩЕГО локального PocketBase: global-setup
 * поднимает свежую базу на 127.0.0.1:8092, применяет pb_migrations/ и
 * сидит тестовых пользователей (см. e2e/global-setup.ts). Старые
 * Convex-моки (e2e/mocks/) приложение перестало импортировать после
 * миграции PLAN7 — с ними e2e молча ходили на боевой сервер.
 *
 * Требование: бинарник pocketbase ($POCKETBASE_BIN, PATH или корень репо).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
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
    env: {
      VITE_POCKETBASE_URL: "http://127.0.0.1:8092",
    },
  },
});
