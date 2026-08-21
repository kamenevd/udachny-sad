import { expect, test, type Page } from '@playwright/test'

/**
 * Полный путь нового садовода: регистрация → участок → план (дом, клумба) →
 * растение → посадка → журнал → история места → общий журнал → PWA-файлы.
 * Работает против живого API; пользователь одноразовый.
 */

const email = `e2e-${Date.now()}@test.udacha.local`
const password = 'e2e-pass-12345'

/** Клик по точке плана в долях ширины/высоты холста. */
async function tapPlan(page: Page, fx: number, fy: number) {
  const box = await page.locator('.plan-svg').boundingBox()
  if (!box) throw new Error('план не найден')
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy)
}

test('регистрация, план, посадка, журнал, история места', async ({ page }) => {
  // — Регистрация
  await page.goto('/')
  await expect(page).toHaveURL(/\/auth/)
  await page.getByRole('button', { name: 'Регистрация' }).click()
  await page.getByLabel('Электронная почта').fill(email)
  await page.getByLabel('Пароль').fill(password)
  await page.getByRole('button', { name: 'Создать аккаунт' }).click()

  // — Новый участок
  await expect(page).toHaveURL(/\/plots/)
  await page.getByRole('button', { name: /Новый участок/ }).click()
  await page.getByLabel('Название').fill('Тестовый сад')
  await page.getByRole('button', { name: 'Создать участок' }).click()
  await expect(page).toHaveURL(/\/plot\//)
  await expect(page.getByRole('button', { name: /Тестовый сад/ })).toBeVisible()

  // — Дом на плане
  await page.getByRole('button', { name: 'Добавить' }).click()
  await page.getByRole('button', { name: /Дом/ }).click()
  await expect(page.getByText(/Коснитесь плана/)).toBeVisible()
  await tapPlan(page, 0.35, 0.5)
  await page.getByRole('button', { name: 'Готово' }).click()
  await expect(page.getByRole('heading', { name: /Дом/ })).toBeVisible()
  await page.getByRole('button', { name: 'Закрыть' }).click()

  // — Клумба
  await page.getByRole('button', { name: 'Добавить' }).click()
  await page.getByRole('button', { name: /Клумба/ }).click()
  await tapPlan(page, 0.68, 0.5)
  await page.getByRole('button', { name: 'Готово' }).click()
  await expect(page.getByRole('heading', { name: /Клумба/ })).toBeVisible()

  // — Посадить новое растение в клумбу
  await page.getByRole('button', { name: /Посадить/ }).click()
  await page.getByRole('button', { name: /Новое растение/ }).click()
  await page.getByLabel('Название').fill('Гортензия метельчатая')
  await page.getByRole('button', { name: /Добавить и посадить/ }).click()
  await expect(page.getByText(/куда посадить/)).toBeVisible()
  await tapPlan(page, 0.68, 0.5)
  await expect(page.getByRole('heading', { name: /Гортензия/ })).toBeVisible()

  // — Быстрый полив с плана
  await page.getByRole('button', { name: /Полил/ }).click()
  await expect(page.getByText(/Полив записан/)).toBeVisible()

  // — Журнал посадки: запись «Цветение»
  await page.getByRole('button', { name: /Журнал/ }).click()
  await expect(page).toHaveURL(/\/planting\//)
  await page.getByRole('button', { name: /Запись в журнал/ }).click()
  await page.getByRole('button', { name: /Цветение/ }).click()
  await page.getByLabel('Заметка').fill('Первые шапки цветов')
  await page.getByRole('button', { name: 'Записать' }).click()
  await expect(page.getByText('Первые шапки цветов')).toBeVisible()

  // — История места (клумбы)
  await page.getByRole('link', { name: /Клумба/ }).click()
  await expect(page).toHaveURL(/\/place\//)
  await expect(page.getByText('Сейчас растёт')).toBeVisible()
  await expect(page.getByRole('link', { name: /Гортензия/ }).first()).toBeVisible()
  await expect(page.getByText('Летопись')).toBeVisible()

  // — Общий журнал через нижнее меню
  await page.getByRole('link', { name: 'Журнал' }).click()
  await expect(page).toHaveURL(/\/journal/)
  await expect(page.getByText(/Гортензия метельчатая — цветение/)).toBeVisible()
  await expect(page.getByText(/Гортензия метельчатая — полив/)).toBeVisible()

  // Фильтр по типу
  await page.getByRole('button', { name: /Цветение/ }).click()
  await expect(page.getByText(/— цветение/)).toBeVisible()
  await expect(page.getByText(/— полив/)).toHaveCount(0)

  // — Перезагрузка: сессия жива, попадаем на план
  await page.goto('/')
  await expect(page).toHaveURL(/\/plot\//)

  // — PWA-файлы
  const manifest = await page.request.get('/manifest.webmanifest')
  expect(manifest.ok()).toBeTruthy()
  const mf = await manifest.json()
  expect(mf.name).toBe('уДачный сад')
  const sw = await page.request.get('/sw.js')
  expect(sw.ok()).toBeTruthy()
  const icon = await page.request.get('/pwa-512.png')
  expect(icon.ok()).toBeTruthy()
})
