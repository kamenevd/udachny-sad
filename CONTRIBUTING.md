# Contributing — уДачный сад

Как добавить фичу, экран, компонент или тест в проект.

---

## 🚀 Быстрый старт

```bash
cd app
npm install
npm run dev          # Vite dev server на :5173
```

Для backend нужен живой Convex deploy:
```bash
npx convex dev       # запускает Convex локально
```

---

## 📐 Coding conventions

### TypeScript
- **strict: false** — но пишем типизированно (всё с типами, без `any`)
- `verbatimModuleSyntax: false` — можно `import { Type }`
- Имена типов — PascalCase, переменных — camelCase
- React-компоненты — PascalCase (например, `PlantCard`)

### React
- Функциональные компоненты только (без class)
- Хуки — в `src/hooks/`, имя с `use` (например, `useSafeMutation`)
- Props interface — `{ ComponentName }Props`
- Используем `useQuery` / `useMutation` из `convex/react`

### Стиль кода
- Одинарные кавычки для строк (в React-файлах)
- Точка с запятой — обязательно
- Отступ — 2 пробела
- Импорты отсортированы: react → библиотеки → наши модули

### Tailwind CSS
- Используем кастомные цвета из `theme/`: `ink`, `paper`, `surface`, `blueink`, `red`, `green`
- Шрифты: `font-poster` (Oswald), `font-mono` (PT Mono)
- Скругления: `rounded-[10px]` (внешняя рамка), `rounded-[6px]` (внутренняя)
- Тень: `shadow-blank` (бумажный стиль)
- Все размеры в `[px]` (например, `text-[17px]`, `gap-4`)

---

## 📱 Добавление нового экрана

1. Создай `src/screens/MyScreen.tsx`
2. Добавь роут в `src/main.tsx` (если нужен)
3. Добавь навигацию из существующего экрана
4. Добавь `<SkipLink />` в начало (a11y)
5. Покрой unit-тестом в `src/__tests__/`

```tsx
// Шаблон экрана
import { SkipLink } from '../components/SkipLink';

export function MyScreen() {
  return (
    <>
      <SkipLink />
      <div className="min-h-screen bg-paper">
        <header className="sticky top-0 z-10 border-b-2 border-ink bg-paper px-4 py-4">
          <h1 className="font-poster text-[21px] uppercase tracking-[0.03em] text-ink" style={{ fontWeight: 700 }}>
            Мой экран
          </h1>
        </header>
        <main id="main-content" className="mx-auto max-w-2xl p-4">
          {/* контент */}
        </main>
      </div>
    </>
  );
}
```

---

## 🧩 Добавление компонента

1. Создай `src/components/MyComponent.tsx`
2. JSDoc-комментарий в начале (что делает, какой задаче относится)
3. Используй дизайн-токены из Tailwind theme
4. Покрой unit-тестом если есть логика

---

## 🗄️ Добавление Convex query/mutation

1. Функция в `convex/{domain}.ts` (например, `convex/plantings.ts`)
2. Валидатор аргументов через `v.*` (например, `v.id("plantings")`)
3. Auth-проверка: `const identity = await ctx.auth.getUserIdentity()`
4. Возвращай типизированные данные
5. Во frontend: `useQuery(api.domain.functionName, args)`

---

## 🧪 Тесты

### Unit (Vitest)
```bash
npm test              # все тесты
npm run test:watch    # watch mode
npm run test:coverage # с покрытием
```

- Тесты в `src/__tests__/*.test.ts(x)`
- Используй `@testing-library/react`
- Моки Convex: `vi.mock("convex/react")`

### E2E (Playwright)
```bash
npm run test:e2e      # все E2E
```

- Тесты в `e2e/*.spec.ts`
- Моки в `e2e/mocks/` (in-memory store, не требуют живого Convex)
- Vite запускается в режиме `e2e` (алиасы подменяют convex/react)

---

## 🔀 Git workflow

```bash
git checkout -b feat/my-feature
# делаем изменения
git add -A
git commit -m "feat: описание (задача X.Y)"
git push
```

### Формат коммитов
- `feat:` — новая фича
- `fix:` — багфикс
- `docs:` — документация
- `test:` — тесты
- `refactor:` — рефакторинг

---

## ✅ Checklist перед PR

- [ ] `npx tsc --noEmit` — без ошибок
- [ ] `npm test` — все тесты зелёные
- [ ] `npm run build` — собирается без ошибок
- [ ] Стиль соответствует дизайн-системе «Садовая книжка»
- [ ] JSDoc-комментарии на новых компонентах/хуках
- [ ] Тесты на новую логику

---

_Проект «уДачный сад» — семейство Каменевых 🌱_
