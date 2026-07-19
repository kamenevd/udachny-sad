import { test, expect, type Page } from "@playwright/test";

/**
 * E2E: навигация между экранами (задача 21.4).
 * Gardens → GardenDetail → PlantingDetail → назад → PlaceHistory → назад,
 * плюс Gardens → Plants. Данные засеяны (?e2e-seed): участок 20×30 м,
 * грядка [2,2]–[18,28], активная посадка «Клубника „Виктория“».
 */

async function loginSeeded(page: Page) {
  await page.goto("/?e2e-seed");
  await page.getByLabel("Email").fill("dachnik@example.com");
  await page.getByLabel("Пароль").fill("secret-123");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page.getByRole("heading", { name: "Мои участки" })).toBeVisible();
}

/**
 * Пересчёт метров листа в экранные координаты канвы — повторяет
 * layout-математику GardenDetail (fit-масштаб, центрирование, PLOT_PADDING 28).
 */
async function plotPoint(page: Page, mxM: number, myM: number) {
  const box = await page.locator(".konvajs-content").boundingBox();
  if (!box) throw new Error("Konva-канва не найдена");
  const scale = Math.min(
    20,
    Math.max(2, Math.min((box.width - 56) / 20, (box.height - 56) / 30)),
  );
  const ox = Math.max(0, (box.width - 20 * scale) / 2);
  const oy = Math.max(0, (box.height - 30 * scale) / 2);
  return { x: box.x + ox + mxM * scale, y: box.y + oy + myM * scale };
}

test.describe("Навигация", () => {
  test("Gardens → GardenDetail → PlantingDetail и обратно", async ({ page }) => {
    await loginSeeded(page);

    // Gardens → GardenDetail
    await page.getByText("Тестовый участок").click();
    await expect(
      page.getByRole("heading", { name: "Тестовый участок" }),
    ).toBeVisible();
    await expect(page.locator(".konvajs-content")).toBeVisible();

    // Маркер посадок — правый верхний угол bbox грядки: метры (18, 2)
    const marker = await plotPoint(page, 18, 2);
    await page.mouse.click(marker.x, marker.y);
    await expect(page.getByText("Посадки этого места")).toBeVisible();

    // PlantingDetail
    await page.getByRole("button", { name: /Клубника/ }).click();
    await expect(
      page.getByRole("heading", { name: "Клубника «Виктория»" }),
    ).toBeVisible();
    await expect(page.getByText("Журнал наблюдений")).toBeVisible();

    // Назад → GardenDetail
    await page.getByRole("button", { name: "Назад" }).click();
    await expect(
      page.getByRole("heading", { name: "Тестовый участок" }),
    ).toBeVisible();

    // Назад → Gardens
    await page.getByRole("button", { name: "Назад" }).click();
    await expect(page.getByRole("heading", { name: "Мои участки" })).toBeVisible();
  });

  test("GardenDetail → ObjectSheet → PlaceHistory и обратно", async ({ page }) => {
    await loginSeeded(page);
    await page.getByText("Тестовый участок").click();
    await expect(page.locator(".konvajs-content")).toBeVisible();

    // Тап по грядке (центр листа — вдали от маркера посадок)
    const center = await plotPoint(page, 10, 15);
    await page.mouse.click(center.x, center.y);
    await expect(
      page.getByRole("button", { name: "Что росло здесь" }),
    ).toBeVisible();

    // PlaceHistory
    await page.getByRole("button", { name: "Что росло здесь" }).click();
    await expect(
      page.getByRole("heading", { name: "Архивная справка" }),
    ).toBeVisible();
    await expect(page.getByText("Клубника")).toBeVisible();

    // Назад → GardenDetail
    await page.getByRole("button", { name: "Назад" }).click();
    await expect(
      page.getByRole("heading", { name: "Тестовый участок" }),
    ).toBeVisible();
  });

  test("Gardens → Справочник растений и обратно", async ({ page }) => {
    await loginSeeded(page);

    await page.getByRole("button", { name: "Справочник растений" }).click();
    await expect(
      page.getByRole("heading", { name: "Справочник растений" }),
    ).toBeVisible();
    await expect(page.getByText("Клубника")).toBeVisible();

    await page.getByRole("button", { name: "Назад" }).click();
    await expect(page.getByRole("heading", { name: "Мои участки" })).toBeVisible();
  });
});
