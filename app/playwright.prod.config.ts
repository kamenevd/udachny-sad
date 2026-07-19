import { defineConfig, devices } from "@playwright/test";

/**
 * PLAN10 C.2 — E2E авторизации против живого прода https://udacha.kdnfx.space.
 * Отдельный конфиг: основной playwright.config.ts поднимает локальный
 * dev-сервер с моками (testDir ./e2e), здесь webServer не нужен.
 *
 * Запуск: npx playwright test --config playwright.prod.config.ts
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "https://udacha.kdnfx.space",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
