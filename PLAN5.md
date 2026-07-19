# PLAN5.md — MoA этап 5: Финальная полировка

> Все 4 предыдущих плана выполнены (93 задачи, 100 тестов, 76 коммитов).
> Этот план — edge cases, PWA доводка, accessibility, и финальные тесты.

---

## Этап 25: i18n подготовка

- [x] Задача 25.1: Создать ru.ts словарь всех строк — вынести хардкод-строки из screens/components в единый файл → файл(ы): `app/src/i18n/ru.ts` [средне]
- [x] Задача 25.2: t() функция — простой ключ→строка, без библиотек (ru-only в MVP) → файл(ы): `app/src/i18n/index.ts` [просто]
- [x] Задача 25.3: Подключить t() в Login.tsx как proof-of-concept → файл(ы): `app/src/screens/Login.tsx` [просто]

## Этап 26: Доступность (a11y)

- [x] Задача 26.1: aria-labels на всех иконочных кнопках — проверить и добавить где нет → файл(ы): `app/src/screens/*.tsx`, `app/src/components/*.tsx` [просто] (аудит: все 23 иконочные кнопки уже имеют aria-label, пробелов не найдено)
- [x] Задача 26.2: Focus visible — добавить focus-visible:ring стили для клавиатурной навигации → файл(ы): `app/src/index.css` [просто]
- [x] Задача 26.3: Reduced motion — уважать prefers-reduced-motion, отключить animate-pulse в skeleton → файл(ы): `app/src/index.css` [просто]
- [x] Задача 26.4: Screen reader announces — live regions для toast и loading → файл(ы): `app/src/components/Toast.tsx` [просто]

## Этап 27: PWA доводка

- [x] Задача 27.1: Offline fallback page — страница «Нет соединения» для navigateFallback → файл(ы): `app/public/offline.html` [просто]
- [x] Задача 27.2: Background sync — отложенные мутации когда offline → файл(ы): `app/src/hooks/useQueuedMutation.ts` [сложно]
- [x] Задача 27.3: App shortcuts deep linking — обработка ?screen=plants из manifest shortcuts → файл(ы): `app/src/main.tsx` [средне]

## Этап 28: Дополнительные тесты

- [x] Задача 28.1: Snapshot тесты компонентов — PlantCard, Stamp, Banner → файл(ы): `app/src/__tests__/snapshots.test.tsx` [средне]
- [x] Задача 28.2: Integration тест Gardens → создание → список — полный flow через mock store → файл(ы): `app/src/__tests__/gardens-flow.test.tsx` [средне]
- [x] Задача 28.3: Edge case тесты — пустые строки, maxLength, NaN в ширине/длине → файл(ы): `app/src/__tests__/edge-cases.test.ts` [просто]

## Этап 29: Performance аудит

- [x] Задача 29.1: React DevTools profiler notes — документировать render patterns в REPORT-FINAL.md → файл(ы): `REPORT-FINAL.md` [просто]
- [x] Задача 29.2: Lazy load GardenDetail — React.lazy + Suspense для тяжёлого Konva-экрана → файл(ы): `app/src/main.tsx` [средне]
- [x] Задача 29.3: Image optimization — lazy loading для PhotoGallery images → файл(ы): `app/src/components/PhotoGallery.tsx` [просто]

## Этап 30: Финальная документация

- [x] Задача 30.1: DEPLOYMENT.md — инструкция деплоя (Convex, Vite build, static host) → файл(ы): `DEPLOYMENT.md` [просто]
- [x] Задача 30.2: TESTING.md — структура тестов, как запускать, coverage → файл(ы): `TESTING.md` [просто]
- [x] Задача 30.3: Обновить README — актуальные цифры (100+ тестов, все фичи) → файл(ы): `README.md` [просто]

---

**Всего задач:** 16
**Приоритет:** 26.x (a11y) и 28.x (тесты) — критичны для качества.
**Цель:** 120+ тестов, полная a11y, PWA offline, чистая документация.
