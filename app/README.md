# уДачный сад 🌱

Веб-сервис для дачников: схема участка, посадки, журнал событий, история.

## Стек

| Слой | Технология |
|---|---|
| Frontend | Vite + React 19 + TypeScript (strict) |
| Стили | Tailwind CSS |
| PWA | vite-plugin-pwa |
| Backend | Convex (queries/mutations, File Storage) |
| Auth | Convex Auth (magic link + Google OAuth) |
| Схема участка | Konva.js + react-konva (установлено, не используется) |

## Запуск локально

```bash
# 1. Установить зависимости
npm install

# 2. Инициализировать Convex (потребуется войти в аккаунт Convex)
npx convex dev

# 3. Настроить переменные окружения
cp .env.example .env.local
# Заполнить VITE_CONVEX_URL из вывода npx convex dev

# 4. Запустить dev-сервер
npm run dev
```

## Деплой на Vercel

```bash
# 1. Задеплоить Convex-бэкенд
npx convex deploy

# 2. Собрать фронтенд
npm run build

# 3. Задеплоить на Vercel
npx vercel --prod
```

### Переменные окружения (Vercel)

| Переменная | Описание |
|---|---|
| `VITE_CONVEX_URL` | URL Convex-деплоя (из `npx convex deploy`) |
| `VITE_CONVEX_AUTH_google_CLIENT_ID` | Google OAuth Client ID |
| `CONVEX_DEPLOY_KEY` | Deploy key Convex (для CI/CD) |

## Структура проекта

```
udachny-sad/
├── convex/              # Convex backend
│   ├── schema.ts        # Схема данных (9 таблиц)
│   ├── gardens.ts       # Queries: listMine, getById
│   ├── gardensMutations.ts  # Mutations: create, remove
│   ├── http.ts          # HTTP endpoint для Convex Auth
│   └── _generated/      # Автогенерируемые типы
├── src/
│   ├── components/      # Button, Input, Modal
│   ├── screens/         # Login, Gardens, GardenDetail
│   ├── lib/             # Утилиты
│   ├── hooks/           # React-хуки
│   ├── auth.ts          # Convex Auth конфигурация
│   ├── App.tsx          # Корневой компонент, маршрутизация
│   ├── main.tsx         # Точка входа
│   └── index.css        # Tailwind + глобальные стили
├── public/              # Статика, иконки PWA
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## PWA

Манифест настроен: название «уДачный сад», тема #22c55e (зелёный).
Иконки-заглушки: `public/icon-192.png`, `public/icon-512.png` (заменить на реальные).
Service Worker регистрируется автоматически (vite-plugin-pwa).

## Схема данных

Полная схема — в [ARCHITECTURE.md](../ARCHITECTURE.md).

9 таблиц Convex: `users`, `gardens`, `schemaObjects`, `lightZones`, `moistureZones`, `plants`, `plantings`, `journalEvents`, `photos`.
