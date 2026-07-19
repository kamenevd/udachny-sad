import { test, expect } from "@playwright/test";

/**
 * E2E: регистрация и логин (задача 21.2).
 * Backend замокан (см. e2e/mocks/) — signIn успешен при пароле от 8 символов.
 */

test.describe("Авторизация", () => {
  test("регистрация: email + пароль → экран «Мои участки»", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "уДачный сад" }),
    ).toBeVisible();

    await page.getByText("Нет аккаунта? Зарегистрироваться").click();
    await page.getByLabel("Email").fill("dachnik@example.com");
    await page.getByLabel("Пароль").fill("secret-123");
    await page.getByRole("button", { name: "Зарегистрироваться" }).click();

    await expect(
      page.getByRole("heading", { name: "Мои участки" }),
    ).toBeVisible();
  });

  test("логин: email + пароль → экран «Мои участки», сессия живёт после reload", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByLabel("Email").fill("dachnik@example.com");
    await page.getByLabel("Пароль").fill("secret-123");
    await page.getByRole("button", { name: "Войти" }).click();

    await expect(
      page.getByRole("heading", { name: "Мои участки" }),
    ).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Мои участки" }),
    ).toBeVisible();
  });

  test("короткий пароль — ошибка, остаёмся на логине", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Email").fill("dachnik@example.com");
    await page.getByLabel("Пароль").fill("1234567");
    await page.getByRole("button", { name: "Войти" }).click();

    await expect(
      page.getByText("Не получилось войти. Проверьте email и пароль."),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "уДачный сад" }),
    ).toBeVisible();
  });

  test("выход: подтверждение в модалке → экран логина", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Email").fill("dachnik@example.com");
    await page.getByLabel("Пароль").fill("secret-123");
    await page.getByRole("button", { name: "Войти" }).click();
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
