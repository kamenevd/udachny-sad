# уДачный сад 🌱

Веб-PWA для дачников: интерактивная схема участка, посадки, журнал событий,
история мест, фотофиксация. Бумажный дизайн, оффлайн-режим.

> Создано для семьи Каменевых 🏡

## Стек

| Слой | Технология |
|---|---|
| Frontend | Vite + React 19 + TypeScript (strict) |
| Стили | Tailwind CSS |
| PWA | vite-plugin-pwa (StaleWhileRevalidate + CacheFirst) |
| Backend | Convex (queries/mutations, File Storage) |
| Auth | Convex Auth (magic link + Google OAuth) |
| Схема участка | Konva.js + react-konva (pan/zoom, рисование объектов, зоны освещённости) |
| Тесты | Vitest + @testing-library/react |

## Возможности

- 🗺️ **Интерактивная схема участка** — рисование грядок, зон, объектов с pan/zoom
- 🌱 **Каталог растений** — справочник по типам (деревья, кустарники, многолетники…)
- 📋 **Посадки** — размещение растений на схеме, статусы, история
- 📔 **Журнал событий** — 12 типов (полив, урожай, болезнь, обрезка…), фото
- 📸 **Фотогалерея** — загрузка с камеры или галереи, штамп даты, lazy-loading изображений
- 📍 **История мест** — что росло на этом месте раньше (севооборот)
- 🔔 **Toast-уведомления** + **OfflineBanner** при потере связи
- 📴 **Оффлайн** — Service Worker кэширует API и изображения, offline.html-фолбэк,
  фоновая синхронизация отложенных мутаций (useQueuedMutation)
- 📱 **PWA** — устанавливается на домашний экран, app shortcuts (deep link
  `?screen=plants`), haptic feedback
- ♿ **A11y** — skip-to-content, focus trap в модалах, focus-visible ring,
  prefers-reduced-motion, live regions (toast/loading), role=alert
- 🌍 **i18n-подготовка** — все строки вынесены в `src/i18n/ru.ts` через `t()`
- ⚡ **Производительность** — lazy-loading экранов (React.lazy/Suspense),
  lazy-loading изображений

## Запуск локально

```bash
# 1. Установить зависимости
npm install

# 2. Инициализировать Convex (потребуется войти в аккаунт Convex)
npx convex dev

# 3. Настроить переменные окружения
cp .env.example .env.local
# Заполнить VITE_CONVEX_URL из вывода npx convex dev

# 4. Запустить dev-сервер
npm run dev
```

## Тесты

```bash
# Запустить все тесты
npx vitest run

# С покрытием
npx vitest run --coverage

# Watch-режим
npx vitest

# E2E (Playwright)
npm run test:e2e
```

126 unit/integration-тестов (17 файлов): компоненты, хуки, скелетоны, формы,
оффлайн, модалы, snapshot-тесты, edge cases, integration-flow. Плюс e2e на
Playwright (auth, навигация, участки). Подробности — в [TESTING.md](../TESTING.md).

## Сборка

```bash
# Проверка типов
npx tsc --noEmit

# Production-сборка
npm run build

# Превью сборки
npm run preview
```

## Деплой

Подробная инструкция — в [DEPLOYMENT.md](../DEPLOYMENT.md).

### Convex-бэкенд

```bash
npx convex deploy
```

### Фронтенд (Vercel)

```bash
npm run build
npx vercel --prod
```

### Переменные окружения (Vercel)

| Переменная | Описание |
|---|---|
| VITE_CONVEX_URL | URL Convex-деплоя (из npx convex deploy) |
| VITE_CONVEX_AUTH_google_CLIENT_ID | Google OAuth Client ID |
| CONVEX_DEPLOY_KEY | Deploy key Convex (для CI/CD) |

## Структура проекта

```
app/
├── convex/                 # Convex backend
│   ├── schema.ts           # Схема данных (9 таблиц)
│   ├── gardens.ts          # Gardens: listMine, getById
│   ├── plantings.ts        # Plantings: create, update, listByGarden
│   ├── journalEvents.ts    # Journal: create, update, listByPlanting
│   ├── plants.ts           # Plants: listMine, create
│   ├── schemaObjects.ts    # Schema objects: create, update
│   ├── zones.ts            # Light/moisture zones
│   ├── photos.ts           # File storage: upload, list, remove
│   ├── stats.ts            # Aggregated stats
│   ├── users.ts            # User profile
│   ├── auth.ts             # Convex Auth config
│   └── http.ts             # HTTP endpoint для Auth
├── src/
│   ├── components/         # Button, Input, Modal, Toast, Skeleton…
│   │   └── canvas/         # Konva: EditorToolbar, zones, markers
│   ├── screens/            # Login, Gardens, GardenDetail, Plants, PlantingDetail
│   ├── hooks/              # useSafeMutation, usePullToRefresh
│   ├── theme/              # canvasColors, canvasPatterns, sky
│   ├── __tests__/          # Vitest-тесты
│   ├── main.tsx            # Точка входа
│   └── index.css           # Tailwind + globals
├── public/                 # Статика, иконки PWA
├── vite.config.ts
├── vitest.config.ts
├── tailwind.config.js
└── package.json
```

## Схема данных

Полная схема — в [ARCHITECTURE.md](../ARCHITECTURE.md).

9 таблиц Convex: users, gardens, schemaObjects, lightZones, moistureZones,
plants, plantings, journalEvents, photos.

## Дизайн

Бумажный стиль (DESIGN.md v5.1): двойные рамки, тени-blank, шрифты font-poster +
font-mono. Цвета: ink (#202836), paper (#FAF6E9), surface, red, blueink.
