import { test, expect } from "@playwright/test";

/**
 * E2E: регистрация и логин (задача 21.2; PLAN13 — против реального
 * локального PocketBase, см. e2e/global-setup.ts).
 *
 * dachnik@example.com / secret-123 засеян глобальным setup'ом;
 * регистрация проверяется на уникальном email, чтобы прогоны
 * не зависели друг от друга.
 */

test.describe("Авторизация", () => {
  test("регистрация: email + пароль → «Мои участки», тур закрывается тапом по фону", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "уДачный сад" }),
    ).toBeVisible();

    await page.getByText("Нет аккаунта? Зарегистрироваться").click();
    await page.getByLabel("Email").fill(`novichok-${Date.now()}@example.com`);
    await page.getByLabel("Пароль").fill("secret-123");
    await page.getByRole("button", { name: "Зарегистрироваться" }).click();

    await expect(
      page.getByRole("heading", { name: "Мои участки" }),
    ).toBeVisible();

    // BUGS.md #2: у нового пользователя открывается онбординг-тур,
    // и один тап по фону его закрывает — приложение не заперто.
    const tour = page.getByTestId("guided-tour-backdrop");
    await expect(tour).toBeVisible();
    await tour.click({ position: { x: 10, y: 10 } });
    await expect(tour).toBeHidden();

    // После закрытия тура CTA пустого состояния кликабелен
    await expect(page.getByText("Ваш сад ждёт своих первых жителей")).toBeVisible();
  });

  test("логин: email + пароль → экран «Мои участки», сессия живёт после reload", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByLabel("Email").fill("dachnik@example.com");
    await page.getByLabel("Пароль").fill("secret-123");
    await page.getByRole("button", { name: "Войти", exact: true }).click();

    await expect(
      page.getByRole("heading", { name: "Мои участки" }),
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Мои участки" }),
    ).toBeVisible();
  });

  test("неверный пароль — ошибка, остаёмся на логине", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Email").fill("dachnik@example.com");
    await page.getByLabel("Пароль").fill("wrong-password");
    await page.getByRole("button", { name: "Войти", exact: true }).click();

    await expect(
      page.getByText("Не получилось войти. Проверьте email и пароль."),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "уДачный сад" }),
    ).toBeVisible();
  });

  test("выход: подтверждение в модалке → экран логина", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("guided-tour-completed", "true");
    });
    await page.goto("/");
    await page.getByLabel("Email").fill("dachnik@example.com");
    await page.getByLabel("Пароль").fill("secret-123");
    await page.getByRole("button", { name: "Войти", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Мои участки" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Выйти" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Точно выходим?")).toBeVisible();
    await dialog.getByRole("button", { name: "Выйти" }).click();

    await expect(
      page.getByRole("heading", { name: "уДачный сад" }),
    ).toBeVisible();
  });
});
