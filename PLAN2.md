# PLAN2.md — Полировка, UX, тесты (этап MoA)

> План 39/39 выполнен. Этот план — доводка до production-ready:
> обработка ошибок, тесты, доступность, edge cases, UX-полировка.

---

## Этап 8: Устойчивость и обработка ошибок

- [x] Задача 8.1: ErrorBoundary — React-класс с componentDidCatch, fallback UI в стиле бумажного журнала («Что-то не так. Но мы не сдаёмся.» + кнопка перезагрузки), обернуть всё приложение в main.tsx → файл(ы): `app/src/components/ErrorBoundary.tsx`, `app/src/main.tsx` [средне]
- [x] Задача 8.2: Offline Indicator — баннер «Нет связи с дачей» при потере соединения с Convex, автоскрытие при восстановлении → файл(ы): `app/src/components/OfflineBanner.tsx` [средне]
- [x] Задача 8.3: Глобальная обработка ошибок мутаций — хук `useSafeMutation`, который ловит ошибки и показывает toast/inline-сообщение вместо белого экрана → файл(ы): `app/src/hooks/useSafeMutation.ts` [сложно]

## Этап 9: Доступность (a11y)

- [x] Задача 9.1: Аудит aria-меток — проверить все интерактивные элементы (кнопки, формы, канва) на наличие aria-label, role, tabindex; добавить недостающие → файл(ы): `app/src/**/*.tsx` [средне]
- [x] Задача 9.2: Поддержка клавиатуры — фокус-стили видны (focus-visible уже есть в Button, проверить остальные), Escape закрывает модалы (уже есть в Modal, проверить fullscreen viewer PhotoGallery) → файл(ы): `app/src/**/*.tsx` [просто]
- [x] Задача 9.3: Контраст и читаемость — проверить все цветовые комбинации на WCAG AA (минимум 4.5:1 для текста), исправить при необходимости → файл(ы): `app/tailwind.config.js` [средне]

## Этап 10: UX-улучшения

- [x] Задача 10.1: Skeleton-лоадеры — вместо «Загрузка…» показать серые placeholder-блоки в стиле карточек (PlantCard skeleton, список растений skeleton) → файл(ы): `app/src/components/Skeleton.tsx` [средне]
- [x] Задача 10.2: Pull-to-refresh на мобильных — обновление списка посадок/событий свайпом вниз на touchscreen → файл(ы): `app/src/hooks/usePullToRefresh.ts` [сложно]
- [x] Задача 10.3: Подтверждение выхода — при нажатии «Выйти» в Gardens показать Modal «Точно выходим? Данные сохранены.» → файл(ы): `app/src/screens/Gardens.tsx` [просто]
- [x] Задача 10.4: Онбординг для нового пользователя — при первом входе показать подсказки: «Нарисуйте участок», «Посадите первое растение», «Ведите журнал» → файл(ы): `app/src/components/OnboardingHint.tsx` [средне]

## Этап 11: Расширение фото-функциональности

- [x] Задача 11.1: Фото в событиях журнала — интегрировать PhotoUpload + PhotoGallery в EventForm (ownerType: journalEvent), чтобы к каждому событию можно было добавить снимки → файл(ы): `app/src/components/EventForm.tsx` [средне]
- [x] Задача 11.2: Фото объектов схемы — интегрировать PhotoGallery в ObjectSheet (ownerType: schemaObject), чтобы видеть фотографии места (до/после посадки) → файл(ы): `app/src/components/ObjectSheet.tsx` [средне]
- [x] Задача 11.3: Подписи к фото — опциональное поле caption при загрузке (модал с Input перед сохранением), отображение в полноэкранном просмотре → файл(ы): `app/src/components/PhotoUpload.tsx`, `app/src/components/PhotoGallery.tsx` [средне]

## Этап 12: PWA и оффлайн

- [x] Задача 12.1: Кастомный service worker — кеширование схем участка и последних данных для оффлайн-просмотра (read-only режим без сети) → файл(ы): `app/public/sw-custom.js`, `app/vite.config.ts` [сложно]
- [x] Задача 12.2: Install Prompt — компонент «Установить приложение» для PWA (beforeinstallprompt event), скрытие если уже установлено → файл(ы): `app/src/components/InstallPrompt.tsx` [средне]
- [x] Задача 12.3: Splash screen и app shortcuts — манифест с shortcuts для быстрых действий («Новая посадка», «Записать событие») → файл(ы): `app/vite.config.ts` [просто]

## Этап 13: Тесты

- [x] Задача 13.1: Настройка Vitest — конфиг, coverage, первый smoke-тест рендера Login → файл(ы): `app/vitest.config.ts`, `app/src/__tests__/smoke.test.tsx` [средне]
- [x] Задача 13.2: Тесты утилит — чистые функции: cardNumberFromId, formatRuDate, formatSize, compressImage параметры → файл(ы): `app/src/__tests__/utils.test.ts` [просто]
- [x] Задача 13.3: Компонентные тесты — Button (варианты, клики), Modal (открытие/закрытие/Escape), StampOverlay (автоскрытие) → файл(ы): `app/src/__tests__/components.test.tsx` [средне]
- [x] Задача 13.4: Convex schema валидация — тест, что schema.ts компилируется и все таблицы имеют индексы по дизайну → файл(ы): `app/src/__tests__/schema.test.ts` [средне]

## Этап 14: Финальная полировка

- [x] Задача 14.1: Code-splitting — динамические import() для экранов (PlantingDetail, PlaceHistory) для уменьшения главного бандла (сейчас 524 КБ) → файл(ы): `app/src/main.tsx` [средне]
- [x] Задача 14.2: SEO мета-теги — title, description, og:tags, theme-color в index.html → файл(ы): `app/index.html` [просто]
- [x] Задача 14.3: Отчёт PLAN2 — сводка выполненного, checklist для деплоя Димой, известные ограничения → файл(ы): `REPORT-PLAN2.md` [просто]

---

**Всего задач:** 21
**Приоритет:** 8.1 (ErrorBoundary) и 10.1 (Skeleton) — критичны для UX.
