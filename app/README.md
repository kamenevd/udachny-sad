# уДачный сад 🌱

Веб-PWA для дачников: интерактивная схема участка, посадки, журнал событий,
история мест, фотофиксация. Бумажный дизайн, оффлайн-режим.

> Создано для семьи Каменевых 🏡

## Стек

| Слой | Технология |
|---|---|
| Frontend | Vite + React 19 + TypeScript (strict) |
| Стили | Tailwind CSS |
| PWA | vite-plugin-pwa (StaleWhileRevalidate + CacheFirst, офлайн-фолбэк) |
| Backend | PocketBase (self-hosted, REST + realtime; миграции в `../pb_migrations/`) |
| Auth | Telegram Login Widget + Яндекс OAuth2 + email/пароль (демо-вход) |
| Схема участка | Konva.js + react-konva (pan/zoom, рисование объектов, зоны освещённости) |
| Тесты | Vitest + @testing-library/react, e2e — Playwright |

> ⚠️ Каталог `convex/` — наследие до-PLAN7 архитектуры, приложение его не
> использует. Источник правды по схеме данных — `../pb_migrations/`.

## Возможности

- 🗺️ **Интерактивная схема участка** — рисование клумб, композиций, зон с pan/zoom
- 🌱 **Каталог растений** — 43 декоративных вида для зоны 4 с трейтами (цветение, свет, влага)
- 🏷️ **Теги-фильтры** — чипы «солнце/полутень/тень/влага» с мульти-выбором
- 📋 **Посадки** — размещение растений на схеме, статусы, история
- 📔 **Журнал событий** — 11 типов (полив, цветение, укрытие, болезнь…), фото
- 🌸 **Сезонный превью** — выбор месяца подсвечивает цветущее; хвойные не «гаснут»
- 📄 **PDF-отчёт** — снимок схемы + экспликация + растения, печать без зависимостей
- 🔔 **«Что сделать сейчас»** — сезонные дела месяца по составу вашего справочника
- 📍 **История мест** — что росло на этом месте раньше
- 📸 **Фотогалерея** — загрузка с камеры или галереи, lazy-loading
- 📴 **Оффлайн** — SWR-кэш API, offline.html-фолбэк, очередь отложенных мутаций
- 📱 **PWA** — установка на домашний экран, app shortcuts, haptic feedback
- ♿ **A11y** — skip-to-content, focus trap, prefers-reduced-motion, live regions
- 🌍 **i18n-подготовка** — строки в `src/i18n/ru.ts` через `t()`

## Запуск локально

```bash
# 1. Установить зависимости
npm install

# 2. Поднять локальный PocketBase (бинарник: pocketbase.io/docs)
#    из корня репозитория, чтобы подхватились pb_migrations/ и pb_hooks/
./pocketbase serve --http=127.0.0.1:8090

# 3. Указать фронтенду адрес бэкенда
echo 'VITE_POCKETBASE_URL=http://127.0.0.1:8090' > .env.local

# 4. Запустить dev-сервер
npm run dev
```

## Тесты

```bash
npx vitest run            # 343 unit/integration-теста (46 файлов)
npx vitest run --coverage # с покрытием
npm run test:e2e          # e2e (Playwright)
```

Подробности — в [TESTING.md](../TESTING.md).

## Сборка и деплой

```bash
npx tsc --noEmit                                            # типы
VITE_POCKETBASE_URL=https://pb.kdnfx.space npm run build    # → dist/
```

Полная инструкция (включая обновление PocketBase на сервере и миграцию
легаси-схемы) — в [DEPLOYMENT.md](../DEPLOYMENT.md).

## Структура проекта

```
app/
├── src/
│   ├── components/         # Button, Modal, Toast, TagFilter, SeasonalTasksCard…
│   │   ├── canvas/         # Konva: EditorToolbar, зоны, маркеры, ExportReport
│   │   ├── BloomingCalendar/  # слайдер месяцев цветения
│   │   └── PlantWizard/    # мастер подбора растений
│   ├── screens/            # Login, Gardens, GardenDetail, Plants, PlantingDetail…
│   ├── hooks/              # useSafePbAction, usePbCollection, usePullToRefresh…
│   ├── lib/                # pb.ts (клиент PocketBase), auth.ts, seasonalTasks…
│   │   └── offline/        # SWR-стратегия, очередь мутаций
│   ├── data/               # каталог растений (43 вида, JSON)
│   ├── theme/              # canvasColors, canvasPatterns, sky
│   ├── types/              # plant.ts — трейты, словари типов
│   ├── i18n/               # строки интерфейса
│   └── __tests__/          # Vitest-тесты
├── public/                 # PWA-иконки, offline.html, sw-update.js
├── e2e/                    # Playwright
└── vite.config.ts          # PWA-манифест, workbox
```

## Схема данных

Источник правды — миграции PocketBase в [`../pb_migrations/`](../pb_migrations/):
users, gardens, schemaObjects, lightZones, moistureZones, plants, plantings,
journalEvents, photos. ER-диаграмма и инварианты — в
[ARCHITECTURE.md](../ARCHITECTURE.md).

## Дизайн

Бумажный стиль (DESIGN.md v5.1): двойные рамки, тени-blank, шрифты font-poster +
font-mono. Цвета: ink (#202836), paper (#FAF6E9), surface, red, blueink.
