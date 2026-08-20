import { test, expect, type Page } from "@playwright/test";

/**
 * E2E: создание участка (задача 21.3; PLAN13 — против реального PocketBase).
 *
 * Каждый тест регистрирует СВОЕГО пользователя: MVP разрешает один участок
 * на аккаунт, а тесты (создание/удаление) гоняются параллельно — общий
 * пользователь делал бы их зависимыми друг от друга.
 */

async function registerFresh(page: Page) {
  // Тур покрыт auth.spec; здесь он перекрывал бы CTA пустого состояния.
  await page.addInitScript(() => {
    localStorage.setItem("guided-tour-completed", "true");
  });
  await page.goto("/");
  await page.getByText("Нет аккаунта? Зарегистрироваться").click();
  await page
    .getByLabel("Email")
    .fill(`sadovod-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`);
  await page.getByLabel("Пароль").fill("secret-123");
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  await expect(page.getByRole("heading", { name: "Мои участки" })).toBeVisible();
}

test.describe("Участки", () => {
  test("создание участка: модалка → участок в списке", async ({ page }) => {
    await registerFresh(page);

    await expect(page.getByText("Ваш сад ждёт своих первых жителей")).toBeVisible();
    await page.getByRole("button", { name: "🏡 Создать первый сад" }).click();

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
    await registerFresh(page);

    await page.getByRole("button", { name: "🏡 Создать первый сад" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Создать" }).click();

    await expect(dialog.getByText("Введите название участка")).toBeVisible();
  });

  test("удаление участка: подтверждение → пустой список", async ({ page }) => {
    await registerFresh(page);

    await page.getByRole("button", { name: "🏡 Создать первый сад" }).click();
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

    await expect(page.getByText("Ваш сад ждёт своих первых жителей")).toBeVisible();
  });
});
