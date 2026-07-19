# pocketbase-infra — инфраструктурные файлы PLAN7 этап A

Claude не имеет SSH/admin-доступа к LXC 108 (192.168.3.59) — только сетевой
доступ к `http://192.168.3.59:8090`. Проверка (`curl .../api/health`) на
момент задачи A.1 уже отвечала `{"message":"API is healthy."}`, то есть
PocketBase на хосте, похоже, уже запущен (кем-то раньше или как часть базового
образа LXC). Файлы ниже подготовлены на случай переустановки/пересборки и
для документирования конфигурации — они **не были применены Claude**.

## A.1 — установка PocketBase (TODO: ручной запуск)

`install.sh` + `pocketbase.service` — скачивает бинарник v0.23.4, создаёт
системного пользователя `pocketbase`, systemd-юнит, слушает `127.0.0.1:8090`.

```bash
scp pocketbase-infra/install.sh pocketbase-infra/pocketbase.service root@192.168.3.59:/tmp/
ssh root@192.168.3.59 'bash /tmp/install.sh'
```

## A.2 — админ-аккаунт (TODO: ручной шаг, не автоматизируется)

Первый заход на `http://192.168.3.59:8090/_/` (или через SSH-туннель, если
порт не публикуется наружу) предлагает создать superuser-аккаунт. Задача
не автоматизируется намеренно — креды администратора не должны проходить
через агента.

## A.3 / A.4 — миграции схемы и правил доступа

См. `pb_migrations/001_init.js` и `pb_migrations/002_rules.js` в корне
проекта. PocketBase применяет их автоматически при старте, если папка
`pb_migrations/` лежит рядом с бинарником — скопировать её на сервер:

```bash
scp -r pb_migrations root@192.168.3.59:/opt/pocketbase/
ssh root@192.168.3.59 'systemctl restart pocketbase'
```

## A.5 — nginx (TODO: ручной деплой)

`nginx-pb.kdnfx.space.conf` — reverse proxy `pb.kdnfx.space` →
`192.168.3.59:8090`, CORS для `udacha.kdnfx.space`, `client_max_body_size 20M`,
`proxy_buffering off` для realtime SSE-подписок PocketBase.
