# PLAN10 — Починка авторизации (MoA: DeepSeek+GLM+Gemini)

> Сгенерирован через TopMoA v2 (PLANNER=Gemini Pro, EXECUTORS=DeepSeek V4 Pro + GLM-5.2, CRITIC=GLM, SYNTHESizer=Gemini Pro).
> Run: 2026-07-19 20:08, 142.4s, 0 fallbacks, 8/8 models alive.
> Full JSON: `~/.hermes/moa-runs/topmoa_v2_20260719_200817_3d0e6f5c.json`

---

## 🎯 Цель

Починить авторизацию на `https://udacha.kdnfx.space`. Сейчас Login.tsx на проде показывает только email/password (старая сборка ещё имеет Яндекс-кнопку, но нерабочую), а Яндекс OAuth падает из-за пустого `redirect_uri=` в PocketBase authURL.

## 🔍 Корневые причины (диагностика Геса — 4 бага, подтверждено)

1. 🔴 **`clientSecret` EMPTY в коллекции users (oauth2.providers[yandex])**. Без него PB не может обменять code на access_token. Нужно PATCH `/api/collections/users` с `clientSecret`. *Гес чинит через admin API — это кред-задача, не для Claude.*

2. 🔴 **`redirect.html` отсутствует** в `/opt/udacha-current/` и `/opt/pocketbase/pb_public/`. PocketBase JS SDK popup flow открывает popup, тот редиректит на `redirect_uri=window.location.origin + "/redirect.html"`. Без файла → 404 → postMessage не доходит → логин висит.

3. 🔴 **Login.tsx выкинул все альтернативные кнопки** во время PLAN9/K.1 cleanup Convex. Сейчас только email+password. Хотя `lib/auth.ts` содержит рабочие `mountTelegramLoginWidget()` и `loginWithYandex()` — но Login их не вызывает.

4. 🟡 **VITE_POCKETBASE_URL не задан** на прода. Клиент идёт на дефолт `http://192.168.3.59:8090` (внутренний IP, недоступный из браузера). Должен быть `https://pb.kdnfx.space`.

**Доп. наблюдения:**
- nginx уже отдаёт `X-Forwarded-Host $host` — конфиг nginx ОК
- `userInfoURL=https://login.yandex.ru/info` — ОК
- `authURL`/`tokenURL` — ОК
- Telegram widget грузит `telegram.org/js/telegram-widget.js` — может блокироваться в РФ, нужен timeout+фолбэк

**Альтернативный путь (если popup flow не заведётся):** Redirect flow через `authWithOAuth2({ provider, url: callbackUrl })` — без popup, полностью на текущей странице. callbackUrl = `/auth/yandex/callback`, отдельный экран ловит code/state из URL.

---

## ✅ Задачи (пересмотрены после диагностики Геса)

### Этап A — Инфра (Гес, не Claude)

- [ ] **A.0. [HUMAN→Гес] `clientSecret` Яндекса** — PATCH `/api/collections/users` с секретом. Секрет в `/root/.secrets/credentials.json` → `yandex_oauth.client_secret`. *Блокер для любого OAuth флоу.*

- [x] **A.1. [GLM] `.env.production`** — `VITE_POCKETBASE_URL=https://pb.kdnfx.space`. Файл: `app/.env.production`. *Просто.*

- [x] **A.2. [GLM→HUMAN] `redirect.html`** — создать в `app/public/redirect.html` (Vite копирует в `dist/`). Содержимое по reference pocketbase-oauth2-setup.md. *Просто.*

### Этап B — Фронтенд (Claude)

- [x] **B.1. [CLAUDE] Login.tsx — вернуть кнопки** — интегрировать Яндекс (`loginWithYandex()`), Telegram widget (`mountTelegramLoginWidget()` с timeout 5s + фолбэк), демо-вход, и сохранить email+password форму. Использовать существующую дизайн-систему (`Button`, `Input`, `bg-paper`, `text-ink`). Файл: `app/src/screens/Login.tsx`. *Средне.*

- [x] **B.2. [CLAUDE] `lib/auth.ts` — redirect flow fallback** *(реализовано через listAuthMethods + authWithOAuth2Code — у SDK 0.27 authWithOAuth2 нет опций `url`/`code`)* — если popup блокируется (мобильные Safari), переключиться на `authWithOAuth2({ provider, url: window.location.origin + '/auth/yandex/callback' })`. Создать экран `YandexCallback.tsx` который ловит code/state и завершает OAuth через `pb.collection('users').authWithOAuth2({ provider, code, codeVerifier, state })`. Файлы: `app/src/lib/auth.ts`, `app/src/screens/YandexCallback.tsx`, интеграция в `main.tsx`. *Сложно.*

- [x] **B.3. [CLAUDE] Telegram fallback UX** — при ошибке загрузки виджета показать текст «Telegram widget недоступен (возможно заблокирован). Используйте Яндекс или email.» Файл: `app/src/screens/Login.tsx`. *Просто.*

### Этап C — Тесты и верификация

- [x] **C.1. [CLAUDE] Unit-тесты** — обновить `app/src/__tests__/auth.test.ts`: loginWithYandex вызывает authWithOAuth2, mountTelegramLoginWidget timeout/error. *Средне.*

- [x] **C.2. [CLAUDE] Playwright E2E** *(tests/e2e/auth.spec.ts + playwright.prod.config.ts; тест кнопок пройдёт после деплоя C.3, тест redirect_uri уже зелёный на проде)* — `tests/e2e/auth.spec.ts`: скриншот login, проверка Yandex button → click → URL содержит `oauth.yandex.ru`, проверка что `redirect_uri` НЕ пустой. *Средне.*

- [ ] **C.3. [HUMAN→Гес] Деплой + скрин** — build, swap symlink, Playwright верификация. *Просто.*
  - ⚠️ Наблюдение при прогоне E2E (2026-07-19): в popup-флоу SDK 0.27 redirect_uri = `https://pb.kdnfx.space/api/oauth2-redirect` (realtime-флоу PB, redirect.html не участвует) — уже непустой и рабочий на проде. Для МОБИЛЬНОГО redirect-флоу (B.2) в настройках Яндекс OAuth-приложения нужно добавить в whitelist ещё один redirect URI: `https://udacha.kdnfx.space/auth/yandex/callback`, и nginx должен отдавать index.html для этого пути (SPA-fallback).

---

## 📊 Сводка

| ID | Тема | Тег | Сложность | Кто |
|----|------|-----|-----------|-----|
| A.0 | clientSecret | [HUMAN] | Просто | Гес |
| A.1 | .env.production | [GLM] | Просто | Гес/TopMoA |
| A.2 | redirect.html | [GLM] | Просто | Гес |
| B.1 | Login.tsx buttons | [CLAUDE] | Средне | Claude |
| B.2 | Redirect flow + Callback screen | [CLAUDE] | Сложно | Claude |
| B.3 | Telegram fallback | [CLAUDE] | Просто | Claude |
| C.1 | Unit tests | [CLAUDE] | Средне | Claude |
| C.2 | Playwright E2E | [CLAUDE] | Средне | Claude |
| C.3 | Deploy | [HUMAN] | Просто | Гес |

## 🔄 Воркфлоу (гибридный)

```
1. TopMoA → PLAN10 ✅ (этот файл)
2. Claude Code (Fable-5) → REVIEW PLAN10 vs кодовой базы
3. Гес → merge → FINAL_PLAN10.md
4. [GLM] задачи через TopMoA executor
5. [CLAUDE] задачи через Claude Code
6. Гес → деплой + Playwright верификация
7. MoA приёмка → отчёт Диме
```
