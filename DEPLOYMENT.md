# DEPLOYMENT.md — инструкция деплоя

> Задача 30.1. Проект состоит из двух частей: Convex-бэкенд (queries/mutations,
> файловое хранилище, auth) и статический фронтенд (Vite-сборка). Деплоятся
> независимо.

## 1. Требования

- Node.js 18+
- Аккаунт [Convex](https://convex.dev)
- Аккаунт хостинга статики (Vercel/Netlify/любой static host) — опционально,
  можно раздавать `dist/` любым веб-сервером

## 2. Convex-бэкенд

### Первый деплой

```bash
cd app
npx convex login       # если ещё не авторизованы
npx convex deploy       # публикует функции из convex/ в production-деплой
```

Команда выведет production `VITE_CONVEX_URL` — он понадобится на шаге 3.

### Переменные окружения Convex (Dashboard → Settings → Environment Variables)

Настраиваются в проекте Convex, а не в `.env` фронтенда:

| Переменная | Описание |
|---|---|
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth (см. `convex/auth.config.ts`) — только если включён вход через Google |

### CI/CD (опционально)

Для деплоя без интерактивного логина используйте deploy key
(Convex Dashboard → Settings → Deploy Keys):

```bash
CONVEX_DEPLOY_KEY=prod:xxxxx npx convex deploy
```

## 3. Фронтенд

### Переменные окружения (`app/.env.local` для dev, или переменные хостинга для prod)

| Переменная | Описание |
|---|---|
| `VITE_CONVEX_URL` | URL production Convex-деплоя (из `npx convex deploy`) |
| `VITE_GOOGLE_ENABLED` | `true`, если включён вход через Google |
| `VITE_CONVEX_AUTH_google_CLIENT_ID` | Google OAuth Client ID (нужен только если `VITE_GOOGLE_ENABLED=true`) |

### Сборка

```bash
cd app
npm install
npx tsc -b          # проверка типов, не даёт собрать сборку с ошибками типов
npm run build        # → app/dist/
```

`npm run build` = `tsc -b && vite build`. Сборка включает PWA-манифест,
service worker (vite-plugin-pwa, `autoUpdate`) и офлайн-фолбэк
(`public/offline.html`).

### Деплой статики

Подходит любой статический хостинг, отдающий `app/dist/` с SPA-фолбэком
(все несуществующие пути → `index.html`, кроме `/api/*`).

**Vercel:**

```bash
npm run build
npx vercel --prod
```

**Netlify / другой static host:** загрузить содержимое `app/dist/` как есть.
Убедитесь, что настроен catch-all редирект на `index.html` (для роутинга
внутри SPA) и что заголовки для `sw.js`/`manifest.webmanifest` не кэшируются
агрессивно (vite-plugin-pwa сам версионирует ассеты через хэши в имени файла).

### Переменные окружения хостинга

Задать те же три переменные (`VITE_CONVEX_URL`, `VITE_GOOGLE_ENABLED`,
`VITE_CONVEX_AUTH_google_CLIENT_ID`) в настройках проекта на хостинге —
они инлайнятся в сборку на этапе `vite build`, поэтому должны быть
доступны *до* сборки, не только в рантайме.

## 4. Порядок обновления (после первого деплоя)

1. `npx convex deploy` — если менялись файлы в `convex/` (схема, функции)
2. `npm run build` + деплой `dist/` — если менялся фронтенд

Convex-схема обратно совместима с автомиграцией: новые опциональные поля
не требуют ручных миграций, но удаление/переименование полей — вручную,
через `convex run` скрипты миграции (см. документацию Convex).

## 5. Откат

- **Фронтенд:** повторный деплой предыдущей сборки (Vercel/Netlify хранят
  историю деплоев — откат через их UI/CLI).
- **Convex:** `npx convex deploy` предыдущего git-коммита (Convex не хранит
  версии функций отдельно от git — откатывать через checkout нужного коммита
  и повторный deploy).

## 6. Проверка после деплоя

- [ ] Открыть production URL, залогиниться (magic link или Google)
- [ ] Создать/открыть участок — убедиться, что Convex-запросы отвечают
- [ ] Проверить PWA: `chrome://inspect` или DevTools → Application →
      Service Workers — worker зарегистрирован, `offline.html` доступен
      в оффлайн-режиме
- [ ] Проверить `npx tsc -b` и `npx vitest run` перед деплоем (см. [TESTING.md](TESTING.md))
