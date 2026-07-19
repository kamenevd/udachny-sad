# Changelog — уДачный сад

Все заметные изменения проекта документируются здесь.
Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/).

---

## [v0.2] — 2026-07-18

### Добавлено
- **E2E тесты (Playwright)** — 10 тестов: авторизация, участки, навигация
- **Skeleton loading** — анимированные плейсхолдеры вместо «Загрузка…» (Gardens, Plants, PlaceHistory)
- **Toast уведомления** — success/error/info с автоскрытием (4 сек)
- **Confirm dialog** — подтверждение перед удалением участка/события
- **Bundle analyzer** — rollup-plugin-visualizer, stats.html
- **Поиск по растениям** — useDeferredValue debounce 300ms
- **PWA** — manifest, service worker (Workbox), offline support, installable
- **OfflineBanner** — индикатор отсутствия сети
- **InstallPrompt** — кнопка установки PWA
- **Pull-to-refresh** — на мобильных
- **Haptic feedback** — вибрация при ошибках (мобильные)
- **useMediaQuery** — адаптивный EditorToolbar
- **SkipLink** — доступность (a11y), переход к контенту
- **ErrorBoundary** — graceful обработка ошибок
- **OnboardingHint** — подсказки для новых пользователей
- **StampOverlay** — визуальные штампы действий
- **REPORT-FINAL.md** — финальный отчёт со статистикой

### Улучшено
- Дизайн-система «Садовая книжка» v5.1 — бумажный стиль, двойные рамки
- Канва: рисование объектов, зон освещения и влажности
- Архивная справка места — история посадок за все годы с фильтром по году

### Техническое
- React 19 + TypeScript 5.7 + Vite 6
- 97 unit тестов + 10 E2E тестов
- Convex как backend (реактивная БД)
- Konva 9 + react-konva 19 для канвы

---

## [v0.1] — 2026-07-17

### Добавлено
- Каркас приложения — 6 экранов (Login, Gardens, GardenDetail, PlantingDetail, Plants, PlaceHistory)
- Дизайн-система «Садовая книжка» (DESIGN.md v5.1)
- Convex схема данных (gardens, plantings, plants, journalEvents, zones, photos, schemaObjects)
- Генплан участка — интерактивная канва
- Журнал событий — полив, цветение, болезни с фото
- Справочник растений — по типам (дерево/кустарник/многолетник/однолетник)
- Авторизация — email/пароль через @convex-dev/auth
- ARCHITECTURE.md — модель данных, ER-диаграмма, инварианты
- PROJECT.md — спецификация проекта
- 86 unit тестов

---

_Формат: [Semantic Versioning](https://semver.org/lang/ru/)_
