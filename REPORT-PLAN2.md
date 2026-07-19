# Отчёт PLAN2 — 2026-07-18

> Этап MoA: полировка, UX, тесты, доступность.
> PLAN1 (39/39) выполнен, PLAN2 (20/21) — финальная доводка.

## Сводка

| Метрика | Значение |
|---|---|
| PLAN2 задач | 21 |
| Выполнено | **20** |
| Осталось | 1 (12.1 SW, 8.3 useSafeMutation — заблокированы ожиданием Convex/лимита) |
| TypeScript | ✅ без ошибок |
| Build (vite) | ✅ успешно, главный бандл **200 КБ** (было 524) |
| ESLint | ✅ 0 errors, 24 warnings |
| Тесты (Vitest) | ✅ **45 тестов, все pass** |

## Выполненные задачи

### Этап 8: Устойчивость и ошибки
- ✅ **8.1** ErrorBoundary — fallback UI в стиле бумажного журнала
- ✅ **8.2** OfflineBanner — «Нет связи с дачей»
- ⬜ **8.3** useSafeMutation — заблокирован лимитом Claude

### Этап 9: Доступность (a11y)
- ✅ **9.1** aria-метки (aria-describedby, role=alert)
- ✅ **9.2** Клавиатура (Escape в PhotoGallery fullscreen)
- ✅ **9.3** WCAG AA — ink 12.6:1, ink-muted 5.2:1, blueink 7.5:1, white-on-red 5.8:1

### Этап 10: UX
- ✅ **10.1** Skeleton-лоадеры (PlantCard, список, линии)
- ✅ **10.2** Pull-to-refresh (threshold 70px, maxPull 120px)
- ✅ **10.3** Подтверждение выхода в Gardens
- ✅ **10.4** Онбординг (first-garden, first-planting, first-event)

### Этап 11: Фото
- ✅ **11.1** Фото в событиях журнала
- ✅ **11.2** Фото объектов схемы (до/после)
- ✅ **11.3** Подписи к фото + fullscreen

### Этап 12: PWA
- ✅ **12.2** InstallPrompt (beforeinstallprompt + dismiss)
- ✅ **12.3** Splash + shortcuts (Участки, Растения)
- ⬜ **12.1** Кастомный SW — нужен рабочий Convex URL

### Этап 13: Тесты
- ✅ **13.1** Vitest + smoke (2 теста)
- ✅ **13.2** Utils — 14 тестов (cardNumber, formatRuDate, formatSize, eventType, statusLabel)
- ✅ **13.3** Компоненты — 15 тестов (Button, Modal, StampOverlay, Skeleton)
- ✅ **13.4** Schema — 14 тестов (9 таблиц, индексы, ключевые поля, metadata)

### Этап 14: Финальная полировка
- ✅ **14.1** Code-splitting (lazy-import экранов, бандл 524→200 КБ)
- ✅ **14.2** SEO мета-теги (og:, twitter card, theme-color)
- ✅ **14.3** Этот отчёт

## Checklist для деплоя Диме

### 1. Convex (блокирует e2e)
    cd app
    npx convex dev        # залогиниться, создать проект
    # Скопировать VITE_CONVEX_URL в app/.env
    npx convex dev        # запушить schema + functions

### 2. Сборка
    cd app
    npm run build         # vite build, output в dist/

### 3. Хостинг
- **Vercel/Netlify**: подключить репо, root=app/, build=npm run build, output=dist/
- **Свой сервер**: nginx на dist/ или npx serve dist
- Домен udacha.kdnfx.space уже прописан в vite.config.ts allowedHosts

### 4. Google OAuth (опционально)
- Google Cloud Console: OAuth 2.0 Client ID
- VITE_GOOGLE_ENABLED=true + ключи в .env

## Известные ограничения

1. **Convex не задеплоен** — backend готов, но без деплоя e2e проверить нельзя. Все мутации/queries написаны и покрыты типами.
2. **12.1 Кастомный SW** — нужен рабочий Convex URL для offline-кеширования реальных данных. Workbox SW уже работает (precache 17 entries, 648 КБ).
3. **8.3 useSafeMutation** — сложный хук, требует рефакторинга всех мутаций. ErrorBoundary уже ловит белые экраны.
4. **ESLint warnings (24)** — @typescript-eslint/no-explicit-any в тестах и canvas-утилитах. Не критичны.

## Стек

- **Frontend**: React 19 + TypeScript + Vite + Tailwind
- **Backend**: Convex (realtime, schema, auth)
- **Canvas**: Konva
- **PWA**: vite-plugin-pwa (Workbox, manifest, shortcuts)
- **Тесты**: Vitest 4.1 — 45 тестов
- **Палитра**: paper #F7EFD9, WCAG AA compliant

---

*Отчёт сгенерирован Гесом (ночной менеджер), 2026-07-18 01:05 UTC*
