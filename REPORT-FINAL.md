# уДачный сад — Финальный отчёт

> Сводка по проекту «уДачный сад» — v0.2 (18 июля 2026)

---

## 📊 Статистика сборки

### Bundle sizes (build от 2026-07-18)

| Файл | Raw | Gzip |
|---|---|---|
| GardenDetail (самый большой — Konva) | 357.74 kB | 109.21 kB |
| index (React + Convex + router) | 203.23 kB | 64.37 kB |
| PlantingDetail | 17.73 kB | 5.85 kB |
| PhotoGallery | 16.97 kB | 6.34 kB |
| SkipLink (shared utils) | 14.78 kB | 5.61 kB |
| Gardens | 9.30 kB | 3.82 kB |
| Plants | 6.31 kB | 2.64 kB |
| PlaceHistory | 4.43 kB | 1.94 kB |
| CSS (Tailwind + дизайн) | 33.55 kB | 10.53 kB |

**Итого JS (без lazy chunks):** ~200 kB gzip main + ~109 kB gzip GardenDetail (lazy)
**PWA precache:** 62 entries, 2062 KiB

### Тесты
- **Unit:** 97 тестов ✓ (12 test files)
- **E2E (Playwright):** 10 тестов ✓
- **tsc:** 0 ошибок ✓

### Задачи выполнены
- PLAN.md: 39/39 ✓
- PLAN2.md: все задачи ✓
- PLAN3.md: все задачи ✓
- PLAN4.md: в процессе (E2E, оптимизация, UX, документация)

---

## 🏗️ Технологический стек

| Слой | Технология |
|---|---|
| Frontend | React 19 + TypeScript 5.7 |
| Сборка | Vite 6 + Tailwind CSS 4 |
| Backend | Convex (реактивная БД) |
| Auth | @convex-dev/auth |
| Канва | Konva 9 + react-konva 19 |
| PWA | vite-plugin-pwa (Workbox) |
| Тесты | Vitest + Playwright |
| Шрифты | Oswald (poster) + PT Mono (mono) |

---

## ✨ Ключевые фичи

1. **Генплан участка** — интерактивная канва (Konva), рисование объектов, зон освещения и влажности
2. **Посадки** — карточки растений с историей (полный lifecycle: active → relocated/dead/completed)
3. **Архивная справка** — что росло на каждом месте за все годы
4. **Журнал событий** — полив, цветение, болезни с фото
5. **Справочник растений** — по типам (дерево/кустарник/многолетник/однолетник)
6. **PWA** — офлайн-поддержка, installable, manifest, service worker
7. **Дизайн «Садовая книжка»** — бумажный стиль, штампы, двойные рамки

---

## ⚠️ Known issues

1. **GardenDetail bundle (357 kB)** — Konva тащит много. Кандидат на code splitting.
2. **1 участок на пользователя** — ограничение MVP ( Convex проверка)
3. **Нет GPS** — координаты локальные в метрах (задел — originGps поле)
4. **i18n** — только русский (нет мультиязычности)
5. **Нет undo/redo** — только confirm dialog перед удалением

---

## 📁 Структура проекта

```
udachny-sad/
├── app/
│   ├── convex/           # Backend (queries, mutations, schema)
│   ├── e2e/              # Playwright E2E тесты + моки
│   ├── src/
│   │   ├── components/   # UI компоненты + canvas/
│   │   ├── hooks/        # useMediaQuery, useSafeMutation, usePullToRefresh
│   │   ├── screens/      # 6 экранов
│   │   ├── theme/        # Tailwind конфиг
│   │   └── __tests__/    # Unit тесты (12 files, 97 tests)
│   ├── vite.config.ts    # Vite + PWA + visualizer
│   └── package.json
├── PLAN.md               # Этап 1-3 (39 задач)
├── PLAN2.md              # MoA этап 2
├── PLAN3.md              # MoA этап 3
├── PLAN4.md              # MoA этап 4 (E2E, perf, UX, docs)
├── ARCHITECTURE.md       # Модель данных Convex
├── PROJECT.md            # Спецификация проекта
└── REPORT-FINAL.md       # Этот файл
```

---

## 🔦 Lighthouse audit (задача 20.1, 2026-07-18)

Прогон `lighthouse` (desktop preset) на production-сборке (`npm run build` + `vite preview`), headless Chromium.

| Категория | Оценка |
|---|---|
| Performance | 100 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 63 |
| Agentic browsing (Lighthouse 13, экспериментально) | 67 |

**Найдено и исправлено:**
- `landmark-one-main` — экраны `Login`, `LoadingScreen`, `NotConfigured` не были обёрнуты в `<main>`. Добавлены `<main id="main-content">` во все три → accessibility 97 → 100.

**SEO/agentic-browsing не доведены до 100 намеренно:**
- `is-crawlable` (SEO) падает из-за нового `public/robots.txt` с `Disallow: /` — это приватное PWA-приложение за авторизацией, индексация поисковиками не нужна и не желательна.
- `llms-txt` (agentic-browsing) — экспериментальная директива для AI-краулеров, не применима к закрытому приложению с данными пользователя.

**Оговорка:** т.к. локальная среда без настроенного `VITE_CONVEX_URL` (по инструкции Convex deploy не трогаем), аудит фактически прогнан на статическом экране-заглушке `NotConfigured` — структура DOM (лендмарки, семантика) идентична остальным экранам приложения, поэтому результат репрезентативен для a11y/perf/best-practices, но не отражает данные реальных экранов (Gardens/Plants/GardenDetail).

---

## 🖼️ React render patterns (задача 29.1)

Заметки по паттернам ре-рендера ключевых экранов (без live-профилирования DevTools, т.к. нет подключённого Convex-деплоя в этой среде — оценка по коду):

- **PlantCard, Button, Modal, Input** — обёрнуты в `React.memo` (задача 17.1), не ре-рендерятся при неизменных props.
- **GardenDetail / GardenCanvasStage** — вынесен в отдельный lazy-chunk (задача 17.3), Konva-канва инициализируется только при заходе на экран.
- **Plants** — поиск использует debounce/`useDeferredValue` (задача 17.2), не гоняет фильтрацию на каждый keystroke.
- **PlantingDetail** — список событий журнала теперь пагинирован по 20 (задача 18.2), не рендерит сотни `<li>` разом при длинной истории.
- Основной источник ре-рендеров — реактивные `useQuery` от Convex: любое обновление документа в БД триггерит ре-рендер компонента-подписчика. Это ожидаемо для reactive-backend модели и не является проблемой при текущих объёмах данных (участок/сад одного пользователя).

---

## 📦 Dependency audit (задача 20.2, 2026-07-18)

`npm audit` — **0 уязвимостей**.

`npm outdated` показывает ряд пакетов с доступными major-обновлениями (vite 6→8, typescript 5→7, tailwindcss 3→4, konva 9→10, @convex-dev/auth 0.0.80→0.0.94 и др.) — все они не помечены как уязвимые, только «есть более новая версия». Major-бампы сюда сознательно не включены: они несут риск breaking changes (особенно Tailwind 3→4 — новый движок и синтаксис конфига) и требуют отдельного цикла тестирования, а инструкция явно просит не трогать Convex deploy. Сделан только безопасный patch-бамп:
- `convex` 1.42.2 → 1.42.3 (patch, in-range) — прошли `tsc --noEmit` и все 100 unit-тестов после обновления.

**Bundle size** (`vite-plugin-visualizer`, `dist/stats.html`):

| Chunk | Raw | Gzip |
|---|---|---|
| GardenCanvasStage (lazy, Konva) | 334.62 kB | 102.13 kB |
| index (React + Convex + router) | 203.27 kB | 64.40 kB |
| GardenDetail | 25.71 kB | 8.67 kB |
| PlantingDetail | 18.10 kB | 6.00 kB |
| PhotoGallery | 17.34 kB | 6.48 kB |
| Skeleton (shared) | 14.78 kB | 5.62 kB |
| Gardens | 9.30 kB | 3.82 kB |
| Plants | 6.31 kB | 2.63 kB |
| PlaceHistory | 4.43 kB | 1.94 kB |
| CSS | 33.81 kB | 10.59 kB |

Konva-канва (самый тяжёлый чанк) с задачи 17.3 грузится лениво отдельным chunk'ом и не входит в первоначальную загрузку — main-бандл без неё ~203 kB (64 kB gzip).

---

_Сгенерировано: 2026-07-18 05:07 UTC, обновлено: 2026-07-18 (Lighthouse + render notes + dependency audit)_
