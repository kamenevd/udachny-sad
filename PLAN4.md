# PLAN4.md — Финальная полировка production-ready (этап MoA-4)

> PLAN1 (39/39) ✅, PLAN2 (23/23) ✅, PLAN3 (15/21 в работе) выполнены.
> Этот план — доводка до идеала: E2E тесты, производительность рендеринга канвы, UX-микроулучшения, documentation.

---

## Этап 21: E2E тесты (Playwright)

- [x] Задача 21.1: Установить Playwright — npm i -D @playwright/test, npx playwright install chromium, базовый конфиг (1 browser, headless) → файл(ы): `app/playwright.config.ts` [просто]
- [x] Задача 21.2: E2E — регистрация и логин — открыть /login, ввести email+пароль, проверить редирект на /gardens → файл(ы): `app/e2e/auth.spec.ts` [средне]
- [x] Задача 21.3: E2E — создание участка — после логина нажать "Новый участок", ввести название, проверить что участок появился в списке → файл(ы): `app/e2e/gardens.spec.ts` [средне]
- [x] Задача 21.4: E2E — навигация между экранами — проверить что router работает: Gardens → GardenDetail → PlantingDetail → PlaceHistory → файл(ы): `app/e2e/navigation.spec.ts` [средне]

## Этап 22: Оптимизация производительности канвы

- [x] Задача 22.1: requestAnimationFrame throttle в рисовании — в useDraw/useDrawZone использовать rAF вместо прямого setState при mousemove → файл(ы): `app/src/components/canvas/useDraw*.ts` [сложно]
- [x] Задача 22.2: React.memo для Konva-узлов — обернуть каждый Shape/Line/Circle в memo с кастомным areEqual (сравнение points/coords) → файл(ы): `app/src/components/canvas/*.tsx` [средне]
- [x] Задача 22.3: OffscreenCanvas для статичных слоёв — зоны условий не меняются часто; рендерить их в offscreen layer → файл(ы): `app/src/components/canvas/ZonesLayer.tsx` [сложно]
- [x] Задача 22.4: Bundle analyzer — добавить rollup-plugin-visualizer, запустить build, зафиксировать размеры чанков в REPORT-FINAL.md → файл(ы): `app/vite.config.ts`, `REPORT-FINAL.md` [просто]

## Этап 23: UX-микроулучшения

- [x] Задача 23.1: Skeleton при загрузке данных — во всех useQuery экранах показать SkeletonList пока data===undefined → файл(ы): `app/src/screens/*.tsx` [просто]
- [x] Задача 23.2: Toast при успешных действиях — после create/update/remove показать success toast ("Сохранено", "Удалено") → файл(ы): `app/src/screens/*.tsx` [просто]
- [x] Задача 23.3: Confirm dialog перед удалением — перед remove участка/растения/события показать confirm modal → файл(ы): `app/src/components/Modal.tsx`, `app/src/screens/*.tsx` [средне]
- [x] Задача 23.4: Undo последнего действия — после удаления показать toast с кнопкой "Отменить" (5 сек), восстановить через re-create → файл(ы): `app/src/hooks/useUndo.ts` [сложно]

## Этап 24: Документация и финализация

- [x] Задача 24.1: ARCHITECTURE.md обновить — актуальная структура компонентов, data flow, Convex schema diagram → файл(ы): `ARCHITECTURE.md` [средне]
- [x] Задача 24.2: CONTRIBUTING.md — как добавить экран/компонент/тест, coding conventions, git workflow → файл(ы): `CONTRIBUTING.md` [просто]
- [x] Задача 24.3: REPORT-FINAL.md — сводка: всего задач выполнено (PLAN1+2+3+4), тестов, bundle size, Lighthouse, known issues → файл(ы): `REPORT-FINAL.md` [просто]
- [x] Задача 24.4: Changelog.md — список всех фич и изменений по версиям (v0.1 → v0.2) → файл(ы): `CHANGELOG.md` [просто]

---

**Всего задач:** 16
**Приоритет:** 22.x (производительность канвы) и 21.x (E2E тесты) — критичны.
**Цель:** 100+ тестов, smooth canvas на 60fps, полная документация.
