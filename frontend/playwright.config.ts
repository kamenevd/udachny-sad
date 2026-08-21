import { defineConfig } from '@playwright/test'

/**
 * E2E против собранного фронта и живого API pb.kdnfx.space.
 * По умолчанию поднимает vite preview; E2E_BASE_URL=https://… гоняет тест
 * против уже развёрнутого сайта.
 */
const external = process.env.E2E_BASE_URL

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  retries: 1,
  use: {
    baseURL: external ?? 'http://127.0.0.1:4300',
    viewport: { width: 390, height: 844 },
    hasTouch: true,
  },
  webServer: external
    ? undefined
    : {
        command: 'npm run preview -- --host 127.0.0.1 --port 4300 --strictPort',
        url: 'http://127.0.0.1:4300',
        reuseExistingServer: true,
        timeout: 30_000,
      },
})
