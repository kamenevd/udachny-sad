import { test, expect } from "@playwright/test";

/**
 * PLAN10 C.2 — E2E авторизации против прода (см. playwright.prod.config.ts).
 * ⚠️ Проходит только ПОСЛЕ деплоя новой сборки (задача C.3, Гес) — до него
 * на проде старый Login без кнопок.
 */

test.describe("Авторизация на проде", () => {
  test("страница логина показывает все способы входа", async ({ page }) => {
    await page.goto("/");

    await page.screenshot({
      path: "test-results/login-page.png",
      fullPage: true,
    });

    // Яндекс-кнопка
    await expect(
      page.getByRole("button", { name: "Войти через Яндекс" }),
    ).toBeVisible();

    // Email/password форма
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Пароль")).toBeVisible();
    await expect(page.getByRole("button", { name: "Войти", exact: true })).toBeVisible();

    // Контейнер Telegram-виджета
    await expect(
      page.getByTestId("telegram-widget-container"),
    ).toBeVisible();
  });

  test("клик по Яндекс-кнопке ведёт на oauth.yandex с непустым redirect_uri", async ({
    page,
  }) => {
    await page.goto("/");

    // Десктопный вьюпорт → popup-флоу: запрос к Яндексу уходит из popup-окна,
    // поэтому слушаем сеть на уровне контекста (ловит запросы всех страниц).
    const oauthRequestPromise = page.context().waitForEvent("request", {
      predicate: (req) => req.url().includes("oauth.yandex"),
      timeout: 20_000,
    });

    await page.getByRole("button", { name: "Войти через Яндекс" }).click();

    const oauthRequest = await oauthRequestPromise;
    const url = new URL(oauthRequest.url());
    expect(url.hostname).toContain("oauth.yandex");

    // Пустой redirect_uri был одним из багов PLAN10. В popup-флоу SDK 0.27
    // (realtime) PocketBase сам подставляет свой endpoint
    // https://pb.kdnfx.space/api/oauth2-redirect — проверяем, что redirect_uri
    // непустой и указывает на наш бэкенд-домен.
    const redirectUri = url.searchParams.get("redirect_uri") ?? "";
    expect(redirectUri).not.toBe("");
    expect(redirectUri).toContain("kdnfx.space");
  });
});
