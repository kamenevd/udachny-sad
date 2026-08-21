# DEPLOYMENT.md — инструкция деплоя

> Актуальная архитектура (после миграции PLAN7 с Convex): статический
> фронтенд (Vite-сборка) + self-hosted **PocketBase**. Продакшен живёт на
> LXC-контейнере в домашней сети:
>
> | Часть | URL | Что это |
> |---|---|---|
> | Фронтенд | https://udacha.kdnfx.space | nginx, раздаёт `app/dist/` |
> | Бэкенд | https://pb.kdnfx.space | PocketBase (`/api/*`, админка `/_/`) |

---

## 0. ⚠️ Состояние живого сервера (аудит 2026-08-20)

Живая база настраивалась вручную в июле 2026 и **разошлась со схемой
репозитория**. Что было найдено (через публичный API, демо-аккаунтом):

1. `plants` — легаси-поля `ownerId`/`species`/`notes` вместо
   `userId`/`latin_name`/`variety`; нет `plantType` и трейтов PLAN12.
2. У `plantings` и `journalEvents` **нет API-правил** — любые запросы
   пользователей получают 403 «Only superusers can perform this action».
   Посадки и журнал в проде не работают вовсе.
3. У `users` нет полей `role`/`locale`; в select-полях нет значений
   PLAN11 (`composition`, `hedge`, `winterizing`).
4. Задеплоенный фронтенд — сборка от 19.07.2026 (до PLAN11/12).

Всё это чинится миграцией `pb_migrations/003b_reconcile_live_schema.js` —
она конвергентно приводит **любое** состояние базы к схеме репозитория,
сохраняя данные (легаси-колонки переименовываются, `plantType`
восстанавливается по роду из латинского названия). Проверена на живом
бинарнике PocketBase 0.29.3: на чистой базе и на реплике легаси-схемы.

---

## 1. Требования

- Node.js 18+ (сборка фронтенда)
- PocketBase ≥ 0.23 (на сервере; проверялось на 0.29.3)
- Доступ на сервер по SSH (или к админке PocketBase `/_/`)

---

## 2. Бэкенд: обновление PocketBase

### 2.1. Бэкап (обязательно перед миграциями)

```bash
ssh <сервер>
systemctl stop pocketbase
cp -a /opt/pocketbase/pb_data /opt/pocketbase/pb_data.backup-$(date +%F)
```

### 2.2. Миграции и хуки

```bash
# с рабочей машины, из корня репозитория
rsync -av pb_migrations/ <сервер>:/opt/pocketbase/pb_migrations/
rsync -av pb_hooks/      <сервер>:/opt/pocketbase/pb_hooks/

# на сервере
systemctl start pocketbase   # миграции применяются автоматически при старте
journalctl -u pocketbase -n 50   # убедиться: «Applied 001…006», без ошибок
```

Порядок применения: `001` (на живой базе выйдет рано — коллекции уже
есть) → `002` → `003` → **`003b` (реконсилиация — главное для живого
сервера)** → `004` (трейты PLAN12) → `005` (сид 43 растений всем
пользователям) → `006` (словари PLAN11).

### 2.3. Провайдеры входа (ручные шаги, один раз)

- **Яндекс OAuth2**: зарегистрировать приложение на
  https://oauth.yandex.ru, redirect URI —
  `https://udacha.kdnfx.space/auth/yandex/callback`; Client ID/Secret
  вставить в админке PocketBase → Settings → Auth providers → Yandex.
- **Telegram Login Widget**: получить токен у @BotFather, привязать домен
  `udacha.kdnfx.space`; токен — в `Environment=TELEGRAM_BOT_TOKEN=…`
  systemd-юнита (см. `pocketbase-infra/pocketbase.service`). Роут
  `pb_hooks/telegram_auth.pb.js` перед первым боевым входом прогнать
  вручную (см. предупреждения в файле).
- **Демо-вход**: кнопка на экране логина ждёт пользователя
  `demo@udacha.local` / `demo2026` — создать через админку, если его нет.

---

## 3. Фронтенд: сборка и деплой

### 3.1. Переменные окружения сборки

| Переменная | Значение для прода |
|---|---|
| `VITE_POCKETBASE_URL` | `https://pb.kdnfx.space` |

Без переменной клиент смотрит на `http://192.168.3.59:8090` (dev-значение
из `src/lib/pb.ts`) — **работает только из домашней сети**.

### 3.2. Сборка

```bash
cd app
npm install
npx tsc --noEmit                     # типы
npx vitest run                       # 343 теста
VITE_POCKETBASE_URL=https://pb.kdnfx.space npm run build   # → app/dist/
```

Сборка включает PWA: манифест, service worker (autoUpdate), офлайн-фолбэк
`offline.html`, SWR-кэш GET-запросов PocketBase (`public/sw-update.js`).

### 3.3. Выкладка

```bash
rsync -av --delete app/dist/ <сервер>:/var/www/udacha/   # путь из nginx-конфига
```

Требования к nginx (см. `pocketbase-infra/nginx-pb.kdnfx.space.conf`):
SPA-фолбэк (все пути → `index.html`), `/api/*` не перехватывать,
`sw.js` и `manifest.webmanifest` — без агрессивного кэша.

---

## 4. Проверка после деплоя

- [ ] https://pb.kdnfx.space/api/health → `200`
- [ ] Вход демо-аккаунтом на https://udacha.kdnfx.space
- [ ] **Создать посадку и событие журнала** — до реконсилиации это
      падало с 403; главный индикатор, что миграция 003b применилась
- [ ] Нарисовать объект «Композиция» на схеме (словарь PLAN11)
- [ ] Справочник: 43+ растения с месяцами цветения (сид 005)
- [ ] PWA: DevTools → Application → Service Workers — worker активен;
      в офлайне открывается `offline.html`, список садов отдаётся из кэша
- [ ] Кнопка PDF-отчёта в шапке схемы открывает печатный отчёт

---

## 5. Откат

- **Фронтенд**: выложить предыдущую сборку `dist/` (держите архив
  последней рабочей).
- **База**: остановить PocketBase, вернуть `pb_data` из бэкапа шага 2.1,
  запустить. Миграции вниз (`migrate down`) для 003b не предусмотрены —
  реконсилиация конвергентна, откат = восстановление бэкапа.

---

## 6. Регулярное обслуживание

- Бэкап `pb_data` (SQLite + файлы фотографий) — cron с копией на другой
  диск/машину; данные пользователей — ключевое обещание продукта.
- Обновление PocketBase: `./pocketbase update` (сначала на копии).
- Сертификаты: certbot renew (nginx).
