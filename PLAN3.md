# PLAN3.md — Production-полировка, edge cases, расширение (этап MoA-3)

> PLAN1 (39/39) ✅ и PLAN2 (21/21) ✅ выполнены.
> Этот план — финальная доводка до production-ready:
> покрытие edge cases, расширение тестов, UX-полировка, производительность.

---

## Этап 15: Расширение тестового покрытия

- [x] Задача 15.1: Тест useSafeMutation — мок useMutation, проверка что при ошибке вызывается showToast и бросается/возвращается результат; mutateWithCatch возвращает { ok: false } → файл(ы): `app/src/__tests__/useSafeMutation.test.ts` [средне]
- [x] Задача 15.2: Тест Skeleton — рендер PlantCardSkeleton, SkeletonList, проверка классов и aria-busy → файл(ы): `app/src/__tests__/skeleton.test.tsx` [просто]
- [x] Задача 15.3: Тест OfflineBanner — рендер при offline=true (видим) и offline=false (скрыт), проверка role=status → файл(ы): `app/src/__tests__/offline.test.tsx` [просто]
- [x] Задача 15.4: Тест EventForm — рендер с типами событий (12 вариантов), проверка что спец-поля урожая показываются только для harvest → файл(ы): `app/src/__tests__/eventform.test.tsx` [средне]

## Этап 16: UX-полировка

- [x] Задача 16.1: Хук useMediaQuery + адаптив канвы — на экранах <640px уменьшить размер toolbar-иконок, на desktop увеличить canvas height; currently GardenDetail — 357KB chunk, проверить можно ли ещё раздробить → файл(ы): `app/src/hooks/useMediaQuery.ts`, `app/src/screens/GardenDetail.tsx` [средне]
- [x] Задача 16.2: Haptic feedback на мобильных — navigator.vibrate при нажатии кнопок (50ms) и ошибках (паттерн [100,50,100]); feature-detect, отключить если не поддерживается → файл(ы): `app/src/components/Button.tsx`, `app/src/hooks/useSafeMutation.ts` [просто]
- [x] Задача 16.3: Confirm-before-unload при несохранённых изменениях — в EventForm/PlantingForm/ObjectSheet если есть dirty state, предупредить при закрытии вкладки (beforeunload event) → файл(ы): `app/src/hooks/useUnsavedChanges.ts` [средне]
- [x] Задача 16.4: Scroll-to-top при смене экрана — при переходе между Gardens→GardenDetail→PlantingDetail прокручивать наверх (window.scrollTo(0,0) в useEffect) → файл(ы): `app/src/main.tsx` [просто]

## Этап 17: Производительность

- [x] Задача 17.1: React.memo для чистых компонентов — обернуть PlantCard, Button, Modal, Input в memo (если ещё нет), предотвратить лишние ре-рендеры → файл(ы): `app/src/components/*.tsx` [средне]
- [x] Задача 17.2: Debounce в поиске растений — если в Plants есть поиск, добавить useDeferredValue или debounce 300ms → файл(ы): `app/src/screens/Plants.tsx` [просто]
- [x] Задача 17.3: Lazy-load Konva — GardenDetail (357KB) грузит Konva синхронно; вынести canvas-компоненты в отдельный lazy-chunk → файл(ы): `app/src/screens/GardenDetail.tsx` [сложно]

## Этап 18: Edge cases и валидация

- [x] Задача 18.1: Валидация координат в schemaObjects — geometry.points должны быть в пределах canvas (не NaN, не Infinity); добавить проверку в convex/schemaObjects.ts create/update → файл(ы): `app/convex/schemaObjects.ts` [средне]
- [x] Задача 18.2: Overflow handling в PlantingDetail — если событий >100, виртуализировать список (react-window или простая пагинация по 20) → файл(ы): `app/src/screens/PlantingDetail.tsx` [средне]
- [x] Задача 18.3: Empty state для PlaceHistory — если у места нет истории, показать дружелюбное сообщение «Здесь ещё ничего не сажали» вместо пустого экрана → файл(ы): `app/src/screens/PlaceHistory.tsx` [просто]
- [x] Задача 18.4: Graceful degradation при отсутствии камеры — PhotoUpload: если getUserMedia недоступен, скрыть кнопку «Сделать снимок», оставить только «Загрузить из галереи» → файл(ы): `app/src/components/PhotoUpload.tsx` [просто]

## Этап 19: Accessibility (расширенный)

- [x] Задача 19.1: Skip-to-content ссылка — скрытая ссылка «Перейти к содержимому» в начале каждого экрана для скринридеров → файл(ы): `app/src/screens/*.tsx` [просто]
- [x] Задача 19.2: Focus trap в модалах — при открытии Modal фокус на первом элементе, Tab зациклен внутри модала, восстановление фокуса при закрытии → файл(ы): `app/src/components/Modal.tsx` [средне]
- [x] Задача 19.3: Reduced motion — проверить что все анимации (sheet-up, skeleton pulse, stamp overlay) уважают prefers-reduced-motion: reduce → файл(ы): `app/src/index.css`, `app/src/components/*.tsx` [средне]

## Этап 20: Финальная проверка

- [x] Задача 20.1: Lighthouse audit — запустить build, проверить Lighthouse PWA/Accessibility/Performance score; зафиксировать метрики в REPORT-FINAL.md → файл(ы): `REPORT-FINAL.md` [просто]
- [x] Задача 20.2: Dependency audit — npm audit, обновить уязвимые пакеты если есть; проверить bundle size через rollup-plugin-visualizer → файл(ы): `package.json` [средне]
- [x] 20.3: Обновить README — инструкции запуска (npm install, npx convex dev, npm run dev), стек, скриншоты-плейсхолдеры → файл(ы): `app/README.md` [просто]

---

**Всего задач:** 19
**Приоритет:** 15.x (тесты) и 19.x (a11y) — критичны для production.
**Цель:** 70+ тестов, Lighthouse 90+, полная keyboard-navigation.
