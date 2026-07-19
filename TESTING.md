# TESTING.md — структура тестов и как запускать

> Задача 30.2. Проект использует два независимых слоя тестов: Vitest
> (unit/integration, jsdom) и Playwright (e2e, реальный браузер).

## 1. Vitest — unit/integration тесты

### Запуск

```bash
cd app
npx vitest run              # разовый прогон
npx vitest                  # watch-режим
npx vitest run --coverage   # с покрытием (v8, HTML-отчёт в coverage/)
```

Текущее состояние: **126 тестов в 17 файлах** (`app/src/__tests__/`).

### Структура (`app/src/__tests__/`)

| Файл | Что покрывает |
|---|---|
| `smoke.test.tsx` | Базовый рендер приложения |
| `components.test.tsx` | Button, Input, Modal и другие UI-примитивы |
| `schema.test.ts` | Структурная валидация Convex-схемы (9 таблиц, индексы, поля) |
| `eventform.test.tsx` | Форма журнала событий (12 типов, severity) |
| `modal.test.tsx` | Focus trap, закрытие по Esc/оверлею |
| `offline.test.tsx` | OfflineBanner, поведение при потере связи |
| `skeleton.test.tsx` | Skeleton-заглушки, LoadingAnnouncer (live region) |
| `toast.test.tsx` | Toast-уведомления, live region |
| `snapshots.test.tsx` | Snapshot-тесты PlantCard, Stamp, Banner |
| `gardens-flow.test.tsx` | Integration: создание/валидация/удаление участка через реактивный mock-store |
| `edge-cases.test.ts` | Граничные случаи форм: пустые строки, maxLength, NaN в числовых полях |
| `useMediaQuery.test.tsx`, `usePanZoom.test.tsx`, `useQueuedMutation.test.tsx`, `useSafeMutation.test.tsx`, `useUndo.test.tsx` | Хуки |
| `utils.test.ts` | Чистые функции/псевдо-алгоритмы (нумерация карточек, лейблы статусов) |

### Конвенции

- Convex (`convex/react`, `@convex-dev/auth/react`) в unit-тестах **мокается**
  через `vi.mock(...)` — тесты не требуют живого Convex-деплоя
  (см. `CONTRIBUTING.md` §«Тестирование»).
- Integration-тесты (`gardens-flow.test.tsx`) используют реактивный
  in-memory mock-store вместо точечных моков отдельных хуков — так
  проверяется полный поток (создание → список → удаление) без реального бэкенда.
- Snapshot-тесты (`snapshots.test.tsx`) — обновлять осознанно
  (`npx vitest run -u`), проверяя diff перед коммитом.
- Новый чистый хелпер — предпочитаем экспортировать его из компонента/экрана
  (`export function validateX(...)`) и тестировать напрямую, а не дублировать
  логику в тесте.

### Покрытие (`vitest.config.ts`)

Coverage считается по `src/components/**` и `src/hooks/**` (провайдер `v8`).
Экраны (`src/screens/**`) и Convex-функции (`convex/**`) покрываются
integration-тестами и e2e, а не строкой coverage-отчёта.

## 2. Playwright — e2e тесты

### Запуск

```bash
cd app
npm run test:e2e
```

### Структура (`app/e2e/`)

| Файл | Что покрывает |
|---|---|
| `auth.spec.ts` | Вход/выход (магик-линк мок) |
| `gardens.spec.ts` | Создание участка, навигация к схеме |
| `navigation.spec.ts` | Переходы между экранами |
| `mocks/` | In-memory моки `convex/react` и `@convex-dev/auth/react` для режима `--mode e2e` |

E2E запускает dev-сервер в режиме `--mode e2e` (`vite.config.ts`): реальный
Convex не нужен, все запросы обслуживает mock-store из `e2e/mocks/`.
PWA (service worker) в этом режиме отключён, чтобы не кэшировать между прогонами.

## 3. Проверка типов

```bash
cd app
npx tsc -b        # или npx tsc --noEmit
```

Обязательна перед коммитом любых изменений в TypeScript-коде — `npm run build`
не соберётся при ошибках типов.

## 4. Чек-лист перед PR / коммитом фичи

- [ ] `npx tsc -b` — без ошибок
- [ ] `npx vitest run` — все тесты зелёные
- [ ] Если менялась вёрстка компонента со snapshot-тестом — `npx vitest run -u`
      и проверен diff снапшота
- [ ] Для новых форм/полей — добавлены edge case тесты (пустые значения,
      границы, некорректный ввод) по аналогии с `edge-cases.test.ts`
- [ ] `npm run test:e2e` — если менялась навигация между экранами
