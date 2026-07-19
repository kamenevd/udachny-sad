# README-PocketBase.md — миграция на PocketBase (PLAN7)

> Статус: этапы A (инфраструктура) и B/C.1 (auth-библиотека, API-клиент)
> частично готовы как код; финальный cutover (Login.tsx, main.tsx, экраны)
> ещё впереди. Этот файл будет дополнен по ходу PLAN7 (задача D.4) — пока
> здесь только то, что нужно для этапов A и B.

## Установка (A.1, A.2, A.5)

Claude, выполнявший миграцию, не имел SSH/admin-доступа к LXC 108
(192.168.3.59) — только сетевой доступ к `http://192.168.3.59:8090`,
который на момент задачи A.1 уже отвечал `/api/health` как healthy.
Готовые, но не применённые артефакты — в `pocketbase-infra/`
(`install.sh`, `pocketbase.service`, `nginx-pb.kdnfx.space.conf`,
подробности в `pocketbase-infra/README.md`).

Ручные шаги:
1. Убедиться, что PocketBase установлен и запущен (см. `pocketbase-infra/`).
2. Первый заход на `http://192.168.3.59:8090/_/` — создать superuser-аккаунт
   (A.2, намеренно не автоматизировано — креды администратора не должны
   проходить через агента).
3. Скопировать `pb_migrations/` и `pb_hooks/` на сервер рядом с бинарником
   (`/opt/pocketbase/pb_migrations/`, `/opt/pocketbase/pb_hooks/`) и
   перезапустить `systemctl restart pocketbase` — миграции применяются
   автоматически при старте.
4. Задеплоить `pocketbase-infra/nginx-pb.kdnfx.space.conf` (A.5) + certbot.

## Миграции схемы (A.3, A.4)

`pb_migrations/001_init.js` — 8 коллекций 1:1 с `app/convex/schema.ts`
(gardens, schemaObjects, lightZones, moistureZones, plants, plantings,
journalEvents, photos) + кастомные поля auth-коллекции `users` (role,
locale). `002_rules.js` — self-only rules для `users` (остальные коллекции
получают owner-scoped rules прямо при создании в 001). `003_telegram_field.js`
— поле `telegramId` для входа через Telegram (см. ниже).

**Не проверено на живом PocketBase** — только `node --check` синтаксиса.
Перед продакшеном прогнать `pocketbase migrate up` и вручную проверить
пару CRUD-операций через `/_/`.

## Авторизация: Telegram + Яндекс (этап B)

Google отключён полностью — вход только через Telegram Login Widget и
Яндекс OAuth2.

### Яндекс (B.2, B.3)

Яндекс — штатный OAuth2-провайдер PocketBase.
1. Зарегистрировать приложение на https://oauth.yandex.ru (**ручное
   действие**, TODO) — redirect URI `https://udacha.kdnfx.space/auth/yandex/callback`
   (уточнить фактический redirect в самом PocketBase admin UI, поле
   Auth providers → Yandex показывает точный callback URL).
2. В админке PocketBase → Settings → Auth providers → Yandex: включить,
   вставить Client ID + Client Secret.

### Telegram (B.1, B.3) — НЕ через Auth providers

Telegram Login Widget — не OAuth2, поэтому в списке "Auth providers"
PocketBase такого пункта нет (это отличие от изначального плана B.3,
где предполагалось, что Telegram включается там же, где Яндекс).
Вместо этого:
1. Получить бот-токен через @BotFather (**ручное действие**, TODO),
   установить домен `udacha.kdnfx.space` в настройках бота.
2. Токен — в переменную окружения `TELEGRAM_BOT_TOKEN` процесса
   PocketBase (например, в systemd unit `Environment=TELEGRAM_BOT_TOKEN=...`
   в `pocketbase-infra/pocketbase.service`, добавить вручную — секрет не
   должен лежать в git).
3. Кастомный роут `pb_hooks/telegram_auth.pb.js` (`POST /api/telegram-auth`)
   проверяет подпись виджета и выдаёт PocketBase auth-токен.
   **⚠️ Файл содержит явные предупреждения о местах, которые нужно
   сверить с реальным PocketBase JSVM API перед деплоем** (точные имена
   `$security.hs256`/`$security.sha256`, метод выдачи токена) — открыть
   файл и прочитать комментарии перед первым запуском.
4. Фронтенд: `app/src/lib/auth.ts` → `mountTelegramLoginWidget()` +
   `loginWithTelegram()` (внутренний, вызывается колбэком виджета).

### Frontend auth-библиотека

`app/src/lib/auth.ts` — `mountTelegramLoginWidget()`, `loginWithYandex()`,
`logout()`, `currentUser()`. Пока **не подключена** к `Login.tsx`/`main.tsx`
— см. PLAN7.md, задача B.4: переключение будет одним коммитом вместе с
завершением этапа C (иначе ломается единственный рабочий вход в
приложение без готовой замены).

## API-клиент (C.1)

`app/src/lib/pb.ts` — инстанс `PocketBase` + типизированные CRUD-обёртки
(`gardens`, `schemaObjects`, `lightZones`, `moistureZones`, `plants`,
`plantings`, `journalEvents`, `photos`) и `photoUrl()`. Не подключён к
экранам — экраны мигрируют по одному в задачах C.2-C.7.
