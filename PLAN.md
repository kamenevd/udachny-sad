# PLAN.md — доведение «уДачный сад» до MVP

> Составлен по PROJECT.md (границы MVP), ARCHITECTURE.md (модель данных, готовые
> образцы queries/mutations §4), DESIGN.md v5.1 (компоненты готовы), REPORT-2026-07-16.md.
>
> **Текущее состояние:** схема БД (9 таблиц) готова; UI-кит v5.1 готов (Button, Input,
> Modal, Stamp, Banner, PlantCard, Registry, Explication, канва-генплан с паттернами);
> экраны — заглушки: Login фейковый, Gardens на localStorage, GardenDetail на mock-данных.
> Convex-функции есть только для gardens. Деплой Convex не выполнен (задача Димы).
>
> **Вне плана (нужен Дима):** `npx convex dev` (логин), запись `VITE_CONVEX_URL` в `.env`,
> ключи Google OAuth. Из-за отсутствия деплоя проверка каждой задачи = `npx tsc --noEmit`
> + `npm run build`; e2e-проверка станет возможна после деплоя.

---

## Этап 1: Backend — Convex-функции (фундамент)

- [x] Задача 1.1: Починить `schema.ts` — импорт `defineSchema/defineTable` из `convex/server` (сейчас ошибочно из `./_generated/server`), добавить `authTables` из `@convex-dev/auth/server` (требование Convex Auth) → файл(ы): `app/convex/schema.ts` [просто]
- [x] Задача 1.2: Перенести `convexAuth(...)` в правильный файл `convex/auth.ts`; оставить только Password-провайдер (Google — за флагом, без ключей не включаем) → файл(ы): `app/convex/auth.ts` [средне]
- [x] Задача 1.3: Переписать `convex/auth.config.ts` в требуемый формат (`{ providers: [{ domain: CONVEX_SITE_URL, applicationID: "convex" }] }`) → файл(ы): `app/convex/auth.config.ts` [просто]
- [x] Задача 1.4: Локальная генерация типов: `npx convex codegen` (не деплой, логин не нужен); включить `convex/` в `tsconfig.include`. Если codegen всё же потребует логин — оставить `convex/` вне tsconfig и зафиксировать блокер в отчёте → файл(ы): `app/convex/_generated/*`, `app/tsconfig.json` [средне]
  - Примечание: `npx convex codegen` требует настроенный деплой (сеть/логин недоступны в LXC), поэтому `_generated/*` написаны вручную по официальному шаблону Convex (детерминированный код, `npx convex dev` перегенерирует идентично). `api.d.ts` пополняется при добавлении каждого модуля. Добавлен `convex/env.d.ts` (типы `process.env` без @types/node).
- [x] Задача 1.5: `convex/users.ts` — `getCurrent` query + helper `getOrCreateUser` через `getAuthUserId` (upsert бизнес-записи users) → файл(ы): `app/convex/users.ts` [средне]
- [x] Задача 1.6: Переписать `gardens.ts` на `getAuthUserId`/helper из users.ts вместо поиска по email; реализовать каскадное удаление (objects, zones, plantings, events, photos + storage) → файл(ы): `app/convex/gardens.ts` [средне]
- [x] Задача 1.7: `convex/schemaObjects.ts` — `listByGarden`, `create`, `update` (geometry/label/style/sortOrder), `remove` с запретом при существующих посадках (инвариант §3.4 ARCHITECTURE) → файл(ы): `app/convex/schemaObjects.ts` [средне]
- [x] Задача 1.8: `convex/zones.ts` — `getByGarden` (оба слоя разом, образец §4.9), `create/update/remove` для lightZones и moistureZones → файл(ы): `app/convex/zones.ts` [средне]
- [x] Задача 1.9: `convex/plants.ts` — `listMine`, `create`, `update`, `remove` (запрет при существующих посадках) → файл(ы): `app/convex/plants.ts` [просто]
- [x] Задача 1.10: `convex/plantings.ts` — `create` (+авто-событие "planting", §4.4), `getActive` (§4.2), `getHistory` по schemaObject (§4.1), `getById` (с растением), `close` (dead/completed + авто-событие), `transplant` (§4.5), `getTransplantChain` (§4.6) → файл(ы): `app/convex/plantings.ts` [сложно]
- [x] Задача 1.11: `convex/journalEvents.ts` — `getByPlanting` (сортировка по eventDate, §4.3), `create` (12 типов, metadata), `update`, `remove` (+hard delete фото события) → файл(ы): `app/convex/journalEvents.ts` [средне]
- [x] Задача 1.12: `convex/photos.ts` — `generateUploadUrl`, `save`, `listByOwner` (с готовыми URL через `ctx.storage.getUrl`), `remove` (hard delete, §4.8) → файл(ы): `app/convex/photos.ts` [средне]

## Этап 2: Подключение фронтенда к Convex

- [x] Задача 2.1: `main.tsx` — обернуть в `ConvexAuthProvider` (URL из `import.meta.env.VITE_CONVEX_URL`), ветки `AuthLoading/Authenticated/Unauthenticated`, роутер экранов оставить state-машиной → файл(ы): `app/src/main.tsx` [средне]
- [x] Задача 2.2: `Login.tsx` — реальные вход/регистрация email+пароль через `useAuthActions().signIn("password", ...)` с переключателем signUp/signIn; кнопку Google скрыть за `VITE_GOOGLE_ENABLED` → файл(ы): `app/src/screens/Login.tsx` [средне]
- [x] Задача 2.3: `Gardens.tsx` — заменить localStorage на `useQuery(api.gardens.listMine)` + `useMutation(create/remove)`, обработка ошибки «уже есть участок», кнопка выхода (signOut) → файл(ы): `app/src/screens/Gardens.tsx` [средне]
- [x] Задача 2.4: `GardenDetail.tsx` — грузить участок (`getById`) и объекты (`schemaObjects.listByGarden`) вместо `mockObjects`; размеры листа из `boundary`, масштаб из `canvasConfig` → файл(ы): `app/src/screens/GardenDetail.tsx` [средне]

## Этап 3: Редактор схемы (канва)

- [x] Задача 3.1: Хук pan/zoom для Stage — touch pinch, drag, wheel; ограничение зума; `showAttributes` от текущего масштаба → файл(ы): `app/src/components/canvas/usePanZoom.ts` [сложно]
- [x] Задача 3.2: Панель инструментов редактора — режимы «просмотр / добавить объект / зоны», выбор типа объекта (11 типов, русские названия, крупные кнопки) → файл(ы): `app/src/components/canvas/EditorToolbar.tsx` [средне]
- [x] Задача 3.3: Рисование объектов — polygon по последовательным тапам (замыкание + кнопка «Готово»), point-типы одним тапом, line для дорожек; сохранение через `schemaObjects.create` → файл(ы): `app/src/components/canvas/useDrawObject.ts` [сложно]
- [x] Задача 3.4: Выделение и перемещение объектов — тап выделяет (кольцо red), drag двигает геометрию (сдвиг всех точек), сохранение `schemaObjects.update` → файл(ы): `app/src/screens/GardenDetail.tsx` [сложно]
- [x] Задача 3.5: Sheet свойств объекта — переименовать (label), «Списать со схемы» с подтверждением и обработкой запрета (есть посадки) → файл(ы): `app/src/components/ObjectSheet.tsx` [средне]
- [x] Задача 3.6: Слой зон условий — рендер lightZones/moistureZones по §3.3 DESIGN (заливка + пунктирная граница + штриховка), переключатель «свет / влага / выкл» (один слой одновременно) → файл(ы): `app/src/components/canvas/ZonesLayer.tsx` [средне]
- [x] Задача 3.7: Рисование зон — polygon + выбор condition (солнце/полутень/тень; сухо/умеренно/влажно), сохранение через `zones.create`, удаление зоны → файл(ы): `app/src/components/canvas/useDrawZone.ts` [сложно]

## Этап 4: Растения и посадки

- [x] Задача 4.1: Экран «Справочник растений» — Registry-список с формой создания (тип: дерево/кустарник/многолетник/однолетник; название; сорт), вход из Gardens → файл(ы): `app/src/screens/Plants.tsx` [средне]
- [x] Задача 4.2: Форма посадки — выбор растения из справочника или создание на месте, дата (дд.мм.гггг), количество, уточнение места (positionNote), заметка; вызов `plantings.create` → файл(ы): `app/src/components/PlantingForm.tsx` [средне]
- [x] Задача 4.3: Маркеры активных посадок на канве — значок на объекте с числом посадок, тап открывает список/карточку → файл(ы): `app/src/components/canvas/PlantingMarkers.tsx` [средне]
- [x] Задача 4.4: Экран посадки — PlantCard с реальными данными (`plantings.getById`), фото, статус, кнопки «Записать событие» и действия статуса → файл(ы): `app/src/screens/PlantingDetail.tsx` [средне]

## Этап 5: Журнал и история

- [x] Задача 5.1: Форма события журнала — 12 типов по-русски, дата, заголовок, описание; спец-поля: урожай (количество + единица-текст), болезнь/вредитель (диагноз, тяжесть) → файл(ы): `app/src/components/EventForm.tsx` [средне]
- [x] Задача 5.2: Лента событий в PlantingDetail — сортировка по eventDate (свежие сверху), редактирование и удаление с Modal-подтверждением → файл(ы): `app/src/screens/PlantingDetail.tsx` [средне]
- [x] Задача 5.3: Печать-подтверждение — показывать Stamp («ПОСАЖЕНО», «ЗАПИСАНО», «СПИСАНО») после успешных мутаций → файл(ы): `app/src/components/StampOverlay.tsx` [просто]
- [x] Задача 5.4: Действия статуса — «Пересадить» (выбор нового объекта схемы → `plantings.transplant`), «Погибло», «Завершить» (→ `plantings.close`), везде подтверждение → файл(ы): `app/src/components/StatusActions.tsx` [сложно]
- [x] Задача 5.5: История места — «Архивная справка»: тап по объекту → посадки за все годы с исходами и периодами (`plantings.getHistory`), фильтр по году → файл(ы): `app/src/screens/PlaceHistory.tsx` [средне]

## Этап 6: Фото

- [x] Задача 6.1: Компонент загрузки фото — `<input capture>` с камеры, компрессия через canvas (≤1600px, JPEG), трёхшаговый upload (generateUploadUrl → POST → save) → файл(ы): `app/src/components/PhotoUpload.tsx` [сложно]
- [x] Задача 6.2: Галерея фото — миниатюры у посадки/события, полноэкранный просмотр, удаление с подтверждением → файл(ы): `app/src/components/PhotoGallery.tsx` [средне]

## Этап 7: Полировка и PWA

- [x] Задача 7.1: PWA-иконки — скрипт генерации `icon-192.png`/`icon-512.png` из `icon.svg` (sharp в devDependencies) → файл(ы): `app/scripts/make-icons.mjs`, `app/public/icon-192.png`, `app/public/icon-512.png` [просто]
- [x] Задача 7.2: Манифест под палитру v5.1 — `theme_color: #F7EFD9`, `background_color: #F7EFD9` вместо зелёного/белого → файл(ы): `app/vite.config.ts` [просто]
- [x] Задача 7.3: Починить `.env.example` — сейчас файл обрывается («VITE_CONVEX_AUTH_google_CLIENT_ID=» без значения); добавить `VITE_GOOGLE_ENABLED=false` с комментариями → файл(ы): `app/.env.example` [просто]
- [x] Задача 7.4: Прогон текстов §7 DESIGN — пустые состояния, ошибки по-русски («Не получилось сохранить…»), лозунги в заголовках; вымпел Banner на экране Gardens при стрике → файл(ы): `app/src/screens/*.tsx` [средне]
- [x] Задача 7.5: Финальная проверка — `npx tsc --noEmit`, `npm run build`, `npm run lint`; итоговый отчёт → файл(ы): `REPORT-<дата>.md` [просто]

---

**Согласовать с Димой перед стартом**
