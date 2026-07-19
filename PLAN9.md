# PLAN9 — MoA: Полевые условия, Offline-first, UX для дачников

> Сгенерирован через MoA (GLM-5.2 + DeepSeek V4 Pro + Nemotron3 Ultra).
> 3 модели независимо проанализировали проект и предложили задачи.
> Дедуплицировано, ранжировано по частоте упоминания (★ — предложено 2+ моделями).

---

## Этап F: Offline-First (★★★ — все 3 модели)

- [x] Задача F.1: Офлайн-очередь мутаций (IndexedDB) — при потере сети запись в журнал/посадка сохраняется локально (через `idb`), помечается иконкой «синхронизируется», автоматически отправляется в PocketBase при восстановлении сети → файл(ы): `app/src/lib/offline/syncEngine.ts`, `app/src/lib/offline/queue.ts`, `app/src/hooks/useOnlineStatus.ts` [Сложно]
- [x] Задача F.2: Service Worker stale-while-revalidate для PocketBase GET-запросов — при навигации юзер видит закэшированную схему мгновенно, фоном SW обновляет кэш → файл(ы): `app/public/sw-update.js`, `app/src/lib/offline/pbCacheStrategy.ts` [Средне]
- [x] Задача F.3: Storage Manager API — проверка свободного места перед загрузкой фото, предупреждение «Мало места на телефоне» → файл(ы): `app/src/hooks/useStorageEstimate.ts`, `app/src/components/PhotoUpload.tsx` [Средне]
- [x] Задача F.4: Индикатор синхронизации в хедере — «⟳ Синхронизируется...» когда есть отложенные мутации, «✓ Всё сохранено» когда очередь пуста → файл(ы): `app/src/components/SyncIndicator.tsx` [Просто]

## Этап G: UX для полевых условий (★★★ — все 3 модели)

- [x] Задача G.1: Режим «Солнечная вспышка» (High Contrast Mode) — тёмный контрастный режим с увеличенными шрифтами (18-20px), крупными кнопками (56x56), контрастом 7:1 (WCAG AAA), убрать тени/градиенты. Сохранять в localStorage, применять до гидратации → файл(ы): `app/src/theme/highContrast.css`, `app/src/hooks/useHighContrast.ts`, `app/src/components/Header.tsx` [Средне]
- [x] Задача G.2: Голосовой ввод событий журнала (Web Speech API) — кнопка «🎤 Голосом» в EventForm, распознавание `ru-RU`, парсинг «полил помидоры» → `{type: 'watering', note: 'помидоры'}`. Фоллбэк на ручной ввод → файл(ы): `app/src/components/VoiceEventButton.tsx`, `app/src/hooks/useSpeechRecognition.ts` [Средне]
- [x] Задача G.3: Увеличенные touch-targets — все интерактивные элементы минимум 48×48px (WCAG), увеличить padding на toolbar-кнопках канвы → файл(ы): `app/src/index.css`, `app/src/components/Button.tsx` [Просто]

## Этап H: Умный поиск и навигация (★★ — 2 модели)

- [x] Задача H.1: Командная палитра (Cmd+K) + поиск по канве — модальный поиск по названию/сорту/типу, при выборе результата — плавный pan/zoom к объекту на канве (Konva `to()` анимация). Доступ через FAB на мобильном → файл(ы): `app/src/components/CommandPalette.tsx`, `app/src/hooks/useCanvasSearch.ts` [Сложно]
- [x] Задача H.2: Контекстные тултипы при выборе грядки — «Средняя освещённость», «В прошлом году: томаты (мучнистая роса)» — берётся из истории места → файл(ы): `app/src/components/canvas/BedContextTooltip.tsx`, `app/src/lib/bedContext.ts` [Средне]

## Этап I: Растения и данные (★★ — 2 модели)

- [x] Задача I.1: Локальная база сортов растений — JSON с 50-100 популярными сортами (томаты, огурцы, перец, картофель), автозаполнение при вводе названия: тип, примерная высота, период цветения → файл(ы): `app/src/data/plantVarieties.ru.json`, `app/src/hooks/usePlantAutocomplete.ts` [Средне]
- [x] Задача I.2: «Умная кисть» для рисования грядок — свободное рисование пальцем с авто-snapping к прямоугольным формам. Для пользователей с низкой точностью пальца → файл(ы): `app/src/components/canvas/SmartBrush.ts` [Сложно]

## Этап J: Напоминания и уведомления (★★ — 2 модели)

- [x] Задача J.1: Локальные push-напоминания (без сервера) — планировщик в Service Worker: «Полей грядку №3», «Не забудь записать урожай». Запрос разрешения через Notification API → файл(ы): `app/src/hooks/useLocalNotifications.ts`, `app/src/lib/notificationScheduler.ts` [Сложно]
- [x] Задача J.2: Умное напоминание о поливе — если событие «полив» не записано >7 дней для активной посадки → показать баннер «Помидоры не поливали 8 дней» → файл(ы): `app/src/hooks/useWateringReminder.ts`, `app/src/components/WateringBanner.tsx` [Средне]

## Этап K: Production-чистка и realtime (★★ — 2 модели)

- [x] Задача K.1: Финальная очистка Convex — удалить все `convex` импорты, хуки, конфиги из исходников (не из package.json — это infra задача). Проверить бандл на мёртвый код через `rollup-plugin-visualizer` → файл(ы): `app/src/**` (grep & remove convex imports) [Средне]
- [x] Задача K.2: PocketBase realtime подписки для журнала — `pb.collection('journalEvents').subscribe()` для мгновенного обновления при изменениях с другого устройства. Optimistic UI с откатом при ошибке → файл(ы): `app/src/hooks/useRealtimeJournal.ts`, `app/src/screens/PlantingDetail.tsx` [Средне]
- [x] Задача K.3: Экран «Забыли пароль?» — reset password flow через PocketBase API, отправка письма-сброса → файл(ы): `app/src/screens/ResetPassword.tsx` [Средне]

## Этап L: История и аналитика

- [x] Задача L.1: Горизонтальная шкала времени в «Истории места» — визуальная лента (как в Apple Health) с drag-to-scroll по годам вместо простого списка → файл(ы): `app/src/components/TimelineScrubber.tsx`, `app/src/screens/PlaceHistory.tsx` [Сложно]
- [x] Задача L.2: AI «Дневник здоровья растения» — агрегированный AI-анализ: паттерны болезней за сезон, рекомендации по севообороту на основе истории места → файл(ы): `app/src/components/PlantHealthDiary.tsx` [Средне]

---

## Сводка

| Этап | Тема | Задач | Сложность |
|---|---|---|---|
| F | Offline-First | 4 | Сложно |
| G | UX для полевых условий | 3 | Средне |
| H | Умный поиск | 2 | Сложно |
| I | Растения и данные | 2 | Сложно |
| J | Напоминания | 2 | Сложно |
| K | Production-чистка | 3 | Средне |
| L | История и аналитика | 2 | Сложно |
| **Итого** | | **18** | |
