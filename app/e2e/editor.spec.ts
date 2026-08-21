import { test, expect, type Page } from "@playwright/test";

/**
 * E2E редактора плана (EDITOR.md) — против реального локального PocketBase.
 *
 * Проверяется именно то, ради чего редактор переписан: дом ставится РОВНЫМ
 * (прямоугольник на сетке 0,5 м), двигается и тянется с привязкой, размеры
 * задаются цифрами, всё автосохраняется и переживает перезагрузку; зоны
 * света и посадка растения из каталога работают; мобильная раскладка 390px
 * управляется пальцем без переключателя режимов.
 */

const PB = "http://127.0.0.1:8092";

// ─── PocketBase REST помощники ──────────────────────────────────────────

async function pbAuth(email: string, password = "secret-123") {
  const res = await fetch(`${PB}/api/collections/users/auth-with-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity: email, password }),
  });
  const json = (await res.json()) as { token: string; record: { id: string } };
  if (!res.ok) throw new Error(`auth failed: ${JSON.stringify(json)}`);
  return { token: json.token, userId: json.record.id };
}

async function pbList<T = Record<string, unknown>>(
  token: string,
  collection: string,
  filter: string,
): Promise<T[]> {
  const url = `${PB}/api/collections/${collection}/records?perPage=100&filter=${encodeURIComponent(filter)}`;
  const res = await fetch(url, { headers: { Authorization: token } });
  const json = (await res.json()) as { items: T[] };
  if (!res.ok) throw new Error(`list ${collection} failed: ${JSON.stringify(json)}`);
  return json.items;
}

async function pbCreate(token: string, collection: string, data: Record<string, unknown>) {
  const res = await fetch(`${PB}/api/collections/${collection}/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`create ${collection} failed: ${JSON.stringify(json)}`);
  return json as { id: string };
}

// ─── UI помощники ───────────────────────────────────────────────────────

async function registerFresh(page: Page): Promise<string> {
  const email = `editor-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.addInitScript(() => {
    localStorage.setItem("guided-tour-completed", "true");
  });
  await page.goto("/");
  await page.getByText("Нет аккаунта? Зарегистрироваться").click();
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Пароль").fill("secret-123");
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  await expect(page.getByRole("heading", { name: "Мои участки" })).toBeVisible();
  return email;
}

async function createGardenAndOpenEditor(page: Page, name = "Тестовая дача") {
  await page.getByRole("button", { name: "🏡 Создать первый сад" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Название").fill(name);
  await dialog.getByLabel("Ширина, м").fill("20");
  await dialog.getByLabel("Длина, м").fill("30");
  await dialog.getByRole("button", { name: "Создать" }).click();
  await page.getByText(name).click();
  await page.getByTestId("open-plot-editor").click();
  await expect(page.getByTestId("plot-canvas")).toBeVisible();
}

/** Ждём, пока очередь автосохранения доедет до сервера */
async function waitSaved(page: Page) {
  await expect(page.getByTestId("save-status")).toHaveAttribute("data-status", "saved", {
    timeout: 10_000,
  });
}

/** Синтетический touch-жест: pointerdown на точке → движение → up */
async function touchDrag(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps = 8,
) {
  await page.evaluate(
    ([f, t, n]) => {
      const opts = (x: number, y: number, extra: Record<string, unknown> = {}) => ({
        bubbles: true,
        cancelable: true,
        composed: true,
        pointerId: 42,
        pointerType: "touch",
        isPrimary: true,
        clientX: x,
        clientY: y,
        ...extra,
      });
      const target = document.elementFromPoint(f.x, f.y)!;
      target.dispatchEvent(new PointerEvent("pointerdown", opts(f.x, f.y, { buttons: 1 })));
      const svg = document.querySelector('[data-testid="plot-canvas"]')!;
      for (let i = 1; i <= n; i++) {
        const x = f.x + ((t.x - f.x) * i) / n;
        const y = f.y + ((t.y - f.y) * i) / n;
        svg.dispatchEvent(new PointerEvent("pointermove", opts(x, y, { buttons: 1 })));
      }
      svg.dispatchEvent(new PointerEvent("pointerup", opts(t.x, t.y)));
    },
    [from, to, steps] as const,
  );
}

/** Тап пальцем (down+up без движения) */
async function touchTap(page: Page, at: { x: number; y: number }) {
  await touchDrag(page, at, at, 1);
}

const onGrid = (v: number) => Math.abs(v * 2 - Math.round(v * 2)) < 1e-6;

interface StoredObject {
  id: string;
  type: string;
  geometry: {
    type: string;
    points: number[][];
    shape?: { kind: string; cx: number; cy: number; w: number; h: number; rot: number };
  };
}

// ─── Десктоп ────────────────────────────────────────────────────────────

test.describe("Редактор плана (десктоп)", () => {
  test("дом: ставится ровным на сетку, двигается, тянется, цифры, undo, перезагрузка", async ({ page }) => {
    const email = await registerFresh(page);
    await createGardenAndOpenEditor(page);
    const { token } = await pbAuth(email);
    const gardenId = (await pbList(token, "gardens", `name="Тестовая дача"`))[0].id as string;

    // 1. Поставить дом из меню «Добавить»
    await page.getByTestId("editor-add").click();
    await page.locator('[data-add-type="building"]').click();
    await expect(page.locator('[data-type="building"]')).toBeVisible();
    await expect(page.getByTestId("inspector")).toBeVisible();
    await waitSaved(page);

    let [house] = (await pbList<StoredObject>(
      token,
      "schemaObjects",
      `gardenId="${gardenId}"`,
    ));
    expect(house.geometry.shape).toBeTruthy();
    expect(house.geometry.shape!.kind).toBe("rect");
    expect(house.geometry.shape!.w).toBe(6);
    expect(house.geometry.shape!.h).toBe(4);
    expect(house.geometry.shape!.rot).toBe(0);
    // Угол дома лежит на сетке 0,5 м
    expect(onGrid(house.geometry.shape!.cx - 3)).toBe(true);
    expect(onGrid(house.geometry.shape!.cy - 2)).toBe(true);
    // points пересчитаны из формы — прямоугольник из 4 углов
    expect(house.geometry.points).toHaveLength(4);

    // 2. Перенос мышью: позиция снова на сетке
    const before = { ...house.geometry.shape! };
    const box = (await page.locator('[data-type="building"]').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 63, box.y + box.height / 2 + 38, { steps: 8 });
    await page.mouse.up();
    await waitSaved(page);

    [house] = await pbList<StoredObject>(token, "schemaObjects", `gardenId="${gardenId}"`);
    expect(house.geometry.shape!.cx).not.toBe(before.cx);
    expect(onGrid(house.geometry.shape!.cx - 3)).toBe(true);
    expect(onGrid(house.geometry.shape!.cy - 2)).toBe(true);

    // 3. Растяжение за угловую ручку: габариты растут шагом 0,5 м
    const handle = (await page.locator('[data-handle="corner-se"]').boundingBox())!;
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
    await page.mouse.down();
    await page.mouse.move(handle.x + handle.width / 2 + 45, handle.y + handle.height / 2 + 45, { steps: 6 });
    await page.mouse.up();
    await waitSaved(page);

    [house] = await pbList<StoredObject>(token, "schemaObjects", `gardenId="${gardenId}"`);
    expect(house.geometry.shape!.w).toBeGreaterThan(6);
    expect(onGrid(house.geometry.shape!.w)).toBe(true);
    expect(onGrid(house.geometry.shape!.h)).toBe(true);

    // 4. Точный размер цифрами: ширина 7 м
    await page.getByTestId("field-w").fill("7");
    await page.getByTestId("field-w").press("Enter");
    await waitSaved(page);
    [house] = await pbList<StoredObject>(token, "schemaObjects", `gardenId="${gardenId}"`);
    expect(house.geometry.shape!.w).toBe(7);

    // 5. Поворот кнопкой +15° и отмена
    await page.getByTestId("rot+15").click();
    await waitSaved(page);
    [house] = await pbList<StoredObject>(token, "schemaObjects", `gardenId="${gardenId}"`);
    expect(house.geometry.shape!.rot).toBe(15);

    await page.getByTestId("editor-undo").click();
    await waitSaved(page);
    [house] = await pbList<StoredObject>(token, "schemaObjects", `gardenId="${gardenId}"`);
    expect(house.geometry.shape!.rot).toBe(0);

    // 6. Перезагрузка: параметрическая форма читается обратно
    await page.reload();
    await expect(page.getByRole("heading", { name: "Мои участки" })).toBeVisible();
    await page.getByText("Тестовая дача").click();
    await page.getByTestId("open-plot-editor").click();
    await expect(page.locator('[data-type="building"]')).toBeVisible();
    await page.locator('[data-type="building"]').click();
    await expect(page.getByTestId("field-w")).toHaveValue("7");
  });

  test("зона света ставится и сохраняется с параметрической формой", async ({ page }) => {
    const email = await registerFresh(page);
    await createGardenAndOpenEditor(page, "Дача с зонами");
    const { token } = await pbAuth(email);
    const gardenId = (await pbList(token, "gardens", `name="Дача с зонами"`))[0].id as string;

    await page.getByTestId("editor-add").click();
    await page.locator('[data-add-zone="sunny"]').click();
    await expect(page.locator('[data-zone-condition="sunny"]')).toBeVisible();
    await waitSaved(page);

    const zones = await pbList<{ condition: string; geometry: { shape?: { kind: string } } }>(
      token,
      "lightZones",
      `gardenId="${gardenId}"`,
    );
    expect(zones).toHaveLength(1);
    expect(zones[0].condition).toBe("sunny");
    expect(zones[0].geometry.shape?.kind).toBe("rect");
  });

  test("посадка растения из каталога на клумбу — посадка и журнал в базе", async ({ page }) => {
    const email = await registerFresh(page);
    await createGardenAndOpenEditor(page, "Дача с клумбой");
    const { token, userId } = await pbAuth(email);
    const gardenId = (await pbList(token, "gardens", `name="Дача с клумбой"`))[0].id as string;

    // Растение в каталоге пользователя
    await pbCreate(token, "plants", {
      userId,
      plantType: "perennial",
      name: "Хоста",
      variety: "Голубая",
      sun_exposure: "partial_shade",
      bloom_months: [7, 8],
    });

    await page.getByTestId("editor-add").click();
    await page.locator('[data-add-type="flowerbed"]').click();
    await waitSaved(page);

    await page.getByTestId("inspector-plant").click();
    await expect(page.getByTestId("plant-picker")).toBeVisible();
    await page.locator('[data-plant-name="Хоста"]').click();
    await page.getByTestId("plant-confirm").click();
    await expect(page.getByTestId("plant-picker")).not.toBeVisible();

    const [bed] = await pbList<StoredObject>(token, "schemaObjects", `gardenId="${gardenId}"`);
    const plantings = await pbList<{ schemaObjectId: string; status: string; id: string }>(
      token,
      "plantings",
      `gardenId="${gardenId}"`,
    );
    expect(plantings).toHaveLength(1);
    expect(plantings[0].schemaObjectId).toBe(bed.id);
    expect(plantings[0].status).toBe("active");

    const events = await pbList<{ eventType: string }>(
      token,
      "journalEvents",
      `plantingId="${plantings[0].id}"`,
    );
    expect(events.some((e) => e.eventType === "planting")).toBe(true);

    // Посадка видна в инспекторе
    await expect(page.getByTestId("inspector").getByText("Хоста")).toBeVisible();

    // Объект с посадками удалить нельзя — история мест сохраняется
    await page.getByTestId("inspector-delete").click();
    await expect(page.getByTestId("inspector").getByText(/удалить место нельзя/)).toBeVisible();
  });
});

// ─── Мобильный 390px ────────────────────────────────────────────────────

test.describe("Редактор плана (мобильный 390px)", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test("палец: дом ставится, план панорамируется, выделенный дом двигается по сетке", async ({ page }) => {
    const email = await registerFresh(page);
    await createGardenAndOpenEditor(page, "Мобильная дача");
    const { token } = await pbAuth(email);
    const gardenId = (await pbList(token, "gardens", `name="Мобильная дача"`))[0].id as string;

    // Поставить дом (кнопки ≥44px)
    const addBtn = page.getByTestId("editor-add");
    const addBox = (await addBtn.boundingBox())!;
    expect(addBox.height).toBeGreaterThanOrEqual(44);
    await addBtn.tap();
    await page.locator('[data-add-type="building"]').tap();
    await expect(page.locator('[data-type="building"]')).toBeVisible();
    // Инспектор — нижняя шторка
    await expect(page.getByTestId("inspector")).toBeVisible();
    await waitSaved(page);

    let [house] = await pbList<StoredObject>(token, "schemaObjects", `gardenId="${gardenId}"`);
    expect(house.geometry.shape!.w).toBe(6);
    expect(onGrid(house.geometry.shape!.cx - 3)).toBe(true);

    // Тап по пустому месту — снять выделение (шторка закрывается).
    // Точка в верхней части листа: вне плавающих кнопок и вне дома в центре.
    const canvas = (await page.getByTestId("plot-canvas").boundingBox())!;
    await touchTap(page, { x: canvas.x + canvas.width / 2, y: canvas.y + 150 });
    await expect(page.getByTestId("inspector")).not.toBeVisible();

    // Палец по пустому месту — панорама (трансформ мира меняется)
    const worldBefore = await page
      .locator('[data-testid="plot-canvas"] > g')
      .first()
      .getAttribute("transform");
    await touchDrag(
      page,
      { x: canvas.x + 60, y: canvas.y + 300 },
      { x: canvas.x + 140, y: canvas.y + 380 },
    );
    const worldAfter = await page
      .locator('[data-testid="plot-canvas"] > g')
      .first()
      .getAttribute("transform");
    expect(worldAfter).not.toBe(worldBefore);

    // Палец по НЕвыделенному дому — тоже панорама, дом не сдвинулся
    let boxHouse = (await page.locator('[data-type="building"]').boundingBox())!;
    await touchDrag(
      page,
      { x: boxHouse.x + boxHouse.width / 2, y: boxHouse.y + boxHouse.height / 2 },
      { x: boxHouse.x + boxHouse.width / 2 + 70, y: boxHouse.y + boxHouse.height / 2 + 40 },
    );
    await waitSaved(page);
    const [houseAfterPan] = await pbList<StoredObject>(token, "schemaObjects", `gardenId="${gardenId}"`);
    expect(houseAfterPan.geometry.shape!.cx).toBe(house.geometry.shape!.cx);
    expect(houseAfterPan.geometry.shape!.cy).toBe(house.geometry.shape!.cy);

    // Тап по дому — выделение; палец по ВЫДЕЛЕННОМУ дому — перенос по сетке
    boxHouse = (await page.locator('[data-type="building"]').boundingBox())!;
    await touchTap(page, {
      x: boxHouse.x + boxHouse.width / 2,
      y: boxHouse.y + boxHouse.height / 2,
    });
    await expect(page.getByTestId("inspector")).toBeVisible();

    boxHouse = (await page.locator('[data-type="building"]').boundingBox())!;
    await touchDrag(
      page,
      { x: boxHouse.x + boxHouse.width / 2, y: boxHouse.y + boxHouse.height / 2 },
      { x: boxHouse.x + boxHouse.width / 2 + 55, y: boxHouse.y + boxHouse.height / 2 - 45 },
    );
    await waitSaved(page);

    [house] = await pbList<StoredObject>(token, "schemaObjects", `gardenId="${gardenId}"`);
    expect(house.geometry.shape!.cx).not.toBe(houseAfterPan.geometry.shape!.cx);
    expect(onGrid(house.geometry.shape!.cx - 3)).toBe(true);
    expect(onGrid(house.geometry.shape!.cy - 2)).toBe(true);
  });
});
