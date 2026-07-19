import { test, expect } from "@playwright/test";

/**
 * E2E: создание участка (задача 21.3).
 * Без сида — пользователь начинает с пустого списка.
 */

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByLabel("Email").fill("dachnik@example.com");
  await page.getByLabel("Пароль").fill("secret-123");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page.getByRole("heading", { name: "Мои участки" })).toBeVisible();
}

test.describe("Участки", () => {
  test("создание участка: модалка → участок в списке", async ({ page }) => {
    await login(page);

    await expect(page.getByText("Ни одной грядки без записи!")).toBeVisible();
    await page.getByRole("button", { name: "+ Добавить участок" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Новый участок")).toBeVisible();
    await dialog.getByLabel("Название").fill("Дача в Малинниках");
    await dialog.getByLabel("Ширина, м").fill("20");
    await dialog.getByLabel("Длина, м").fill("30");
    await dialog.getByRole("button", { name: "Создать" }).click();

    await expect(page.getByText("Дача в Малинниках")).toBeVisible();
    await expect(page.getByText("20 × 30 м")).toBeVisible();
  });

  test("валидация: без названия участок не создаётся", async ({ page }) => {
    await login(page);

    await page.getByRole("button", { name: "+ Добавить участок" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Создать" }).click();

    await expect(dialog.getByText("Введите название участка")).toBeVisible();
  });

  test("удаление участка: подтверждение → пустой список", async ({ page }) => {
    await login(page);

    await page.getByRole("button", { name: "+ Добавить участок" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Название").fill("Временный");
    await dialog.getByLabel("Ширина, м").fill("10");
    await dialog.getByLabel("Длина, м").fill("10");
    await dialog.getByRole("button", { name: "Создать" }).click();
    await expect(page.getByText("Временный")).toBeVisible();

    await page.getByRole("button", { name: "Удалить участок" }).click();
    const confirm = page.getByRole("dialog");
    await expect(confirm.getByText("Списать участок?")).toBeVisible();
    await confirm.getByRole("button", { name: "Списать" }).click();

    await expect(page.getByText("Ни одной грядки без записи!")).toBeVisible();
  });
});
