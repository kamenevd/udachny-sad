# уДачный сад — Архитектура: модель данных

> Модель данных для MVP на базе **Convex**.
> Описывает таблицы, поля, связи, индексы и ключевые инварианты.
> Особое внимание — сохранению истории посадок (см. раздел «Инварианты»).

---

## Содержание

1. [Обзор модели](#1-обзор-модели)
2. [Сущности и поля (Convex-схема)](#2-сущности-и-поля-convex-схема)
3. [Инварианты и бизнес-правила](#3-инварианты-и-бизнес-правила)
4. [Примеры queries / mutations](#4-примеры-queries--mutations)
5. [ER-диаграмма](#5-er-диаграмма)
6. [Сводная таблица: все таблицы и индексы](#6-сводная-таблица-все-таблицы-и-индексы)

---

## 1. Обзор модели

### 1.1. Технологический стек данных

| Компонент | Технология |
|---|---|
| База данных | **Convex** (реактивная БД) |
| Схема данных | `defineTable` + валидаторы `v.*` |
| Файлы (фото) | **Convex File Storage** (встроенное хранилище, таблица `_storage`) |
| API | **Convex queries / mutations** (не REST) |
| Идентификаторы | **Convex `Id`** — `v.id("tableName")` (не UUID) |
| Время | **Convex timestamp** — `v.number()` (мс от epoch) |
| Вложенные структуры | `v.object()` и `v.array()` (встроенные объекты внутри полей) |

> **Важно:** Convex не использует внешнее SQL-хранилище, объектное хранилище (S3) или гео-расширения (PostGIS). Все данные — в таблицах Convex. Файлы — во встроенном File Storage. Доступ — через типизированные queries и mutations.

### 1.2. Принципы проектирования

1. **История неизменна.** Посадка никогда не удаляется. При пересадке или гибели — запись закрывается (`status = "relocated"` / `"dead"` / `"completed"`), но остаётся в БД и привязана к месту.
2. **Растение ≠ Посадка.** Растение (`plants`) — персональный справочник (тип, название, сорт). Посадка (`plantings`) — конкретный акт высадки конкретного растения в конкретное место в конкретное время. Одно растение можно посадить несколько раз.
3. **Координаты — локальные, в метрах.** Все геометрические формы хранятся как массивы точек `[x, y]` в метрах относительно начала координат участка. GPS не используется в MVP, но у участка есть опциональное поле `originGps` — задел на будущее.
4. **Два независимых слоя зон.** Зоны освещённости (`lightZones`) и зоны влажности (`moistureZones`) — отдельные таблицы. Они не совпадают геометрически и не объединяются.
5. **Фото — полиморфная сущность.** Привязывается к посадке, событию журнала или объекту схемы. Файлы хранятся в Convex File Storage.
6. **Каждое событие журнала допускает заметку и фото.** Независимо от типа (полив, цветение, болезнь и т.д.) — пользователь может добавить описание и фотографии.

### 1.3. Высокоуровневая диаграмма

```
┌──────────┐     ┌──────────┐     ┌──────────────────┐
│  users   │────▶│ gardens  │────▶│  schemaObjects   │
│(пользователь)│  │(участок) │     │  (объект схемы)   │
└──────────┘     └────┬─────┘     └────────┬─────────┘
    1:∞               │ 1:∞               │ 1:∞
                     │                    │
         ┌───────────┼───────────┐        │
         ▼           ▼           ▼        ▼
  ┌────────────┐ ┌────────────┐ ┌──────────────────┐
  │ lightZones │ │moistureZones│ │    plantings     │
  │(зоны света)│ │(зоны влаги) │ │ (растение+место+ │
  └────────────┘ └────────────┘ │  период)          │
                               └────────┬─────────┘
                    ┌───────────────────┼──────────────┐
                    ▼                   ▼              ▼
           ┌──────────────┐  ┌──────────────────┐  ┌────────┐
           │    plants     │  │  journalEvents    │  │ photos │
           │ (справочник)  │  │  (журнал событий)  │  │(фото)  │
           └──────────────┘  └──────────────────┘  └───┬────┘
                                                         │
                                                  ┌──────▼──────┐
                                                  │  _storage   │
                                                  │(Convex File │
                                                  │  Storage)   │
                                                  └─────────────┘
```

---

## 2. Сущности и поля (Convex-схема)

> В Convex идентификатор документа (`_id`) генерируется автоматически — его не нужно объявлять в схеме. Тип `v.id("tableName")` используется для ссылок на другие таблицы.

### 2.1. `users` — Пользователь

```typescript
users: defineTable({
  name: v.string(),                                  // отображаемое имя («Светлана»)
  email: v.string(),                                 // уникальный, для входа
  role: v.optional(v.string()),                      // "owner" (MVP). "viewer" — после MVP
  locale: v.optional(v.string()),                    // "ru" по умолчанию (MVP — только русский)
  createdAt: v.number(),                             // время Convex (мс от epoch)
  updatedAt: v.number(),
})
  .index("by_email", ["email"]),
```

| Поле | Тип | Обяз. | Описание |
|---|---|---|---|
| `name` | `v.string()` | ✅ | Отображаемое имя |
| `email` | `v.string()` | ✅ | Уникальный email для входа |
| `role` | `v.optional(v.string())` | — | `"owner"` (MVP). Роль `"viewer"` — после MVP (Q7) |
| `locale` | `v.optional(v.string())` | — | `"ru"` — MVP только на русском (Q11) |
| `createdAt` | `v.number()` | ✅ | Дата регистрации |
| `updatedAt` | `v.number()` | ✅ | Последнее обновление профиля |

> **Аутентификация:** Управляется через Convex Auth. Пароли и сессии — вне схемы бизнес-данных.

---

### 2.2. `gardens` — Участок

```typescript
gardens: defineTable({
  ownerId: v.id("users"),                            // владелец участка
  name: v.string(),                                  // «Дача в Малинниках»
  description: v.optional(v.string()),               // произвольное описание
  boundary: v.optional(v.object({                    // контур участка
    points: v.array(v.array(v.number())),            // [[x, y], ...] — метры, локальные координаты
  })),
  originGps: v.optional(v.object({                   // опциональная GPS-точка начала координат (Q2)
    lat: v.number(),                                 // широта
    lng: v.number(),                                 // долгота
  })),
  canvasConfig: v.optional(v.object({                // настройки канваса
    scale: v.optional(v.number()),                   // масштаб отображения
    background: v.optional(v.string()),              // цвет/изображение фона
    unitLabel: v.optional(v.string()),               // подпись единиц измерения («м»)
  })),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_owner", ["ownerId"]),
```

| Поле | Тип | Обяз. | Описание |
|---|---|---|---|
| `ownerId` | `v.id("users")` | ✅ | Владелец участка |
| `name` | `v.string()` | ✅ | Название участка |
| `description` | `v.optional(v.string())` | — | Произвольное описание |
| `boundary` | `v.optional(v.object())` | — | Контур участка: `{ points: [[x,y],...] }` в метрах |
| `originGps` | `v.optional(v.object())` | — | GPS-координата точки (0,0) — **задел на будущее** (Q2). Позволит конвертировать локальные метры в GPS |
| `canvasConfig` | `v.optional(v.object())` | — | Настройки канваса: масштаб, фон, единицы |
| `createdAt` | `v.number()` | ✅ | |
| `updatedAt` | `v.number()` | ✅ | |

> **Несколько участков (Q9):** Модель данных поддерживает несколько участков на пользователя. UI в MVP ограничивает одним.

---

### 2.3. `schemaObjects` — Объект схемы

Объект схемы — любой элемент, нарисованный на схеме участка: постройка, дорожка, грядка, клумба, дерево, калитка и т.д.

```typescript
schemaObjects: defineTable({
  gardenId: v.id("gardens"),                         // участок
  type: v.string(),                                  // тип объекта (см. ниже)
  label: v.optional(v.string()),                     // подпись на схеме («Теплица», «Грядка №1»)
  geometry: v.object({                               // геометрия объекта
    type: v.string(),                                // "point" | "line" | "polygon"
    points: v.array(v.array(v.number())),            // [[x, y], ...] — метры, локальные координаты
  }),
  style: v.optional(v.object({                       // визуальный стиль
    color: v.optional(v.string()),                   // цвет линии/контура
    fillColor: v.optional(v.string()),               // цвет заливки
    strokeWidth: v.optional(v.number()),             // толщина линии
    icon: v.optional(v.string()),                    // иконка
  })),
  sortOrder: v.optional(v.number()),                 // z-index отрисовки
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_garden", ["gardenId"])
  .index("by_garden_and_type", ["gardenId", "type"]),
```

**Допустимые значения `type`:**

| Значение | Геометрия | Описание |
|---|---|---|
| `"building"` | polygon | Постройка (дом, баня, сарай) |
| `"greenhouse"` | polygon | Теплица |
| `"lawn"` | polygon | Газон |
| `"path"` | line / polygon | Дорожка |
| `"bed"` | polygon | Грядка |
| `"flowerbed"` | polygon | Клумба |
| `"tree"` | point | Дерево (схематичное) |
| `"shrub"` | point | Кустарник (аналогично tree) |
| `"water"` | polygon | Водоём, колодец |
| `"gate"` | point | Калитка, ворота |
| `"other"` | любая | Прочее |

> **Координаты (Q2):** Точки — локальные, в метрах относительно начала координат участка. Для точки (`"point"`) массив содержит один элемент, для линии (`"line"`) — последовательность, для полигона (`"polygon"`) — замкнутый контур.

---

### 2.4. `lightZones` — Зона освещённости

**Слой «свет».** Независим от слоя влажности — зоны могут не совпадать геометрически (Q4).

```typescript
lightZones: defineTable({
  gardenId: v.id("gardens"),                         // участок
  name: v.optional(v.string()),                      // название («Солнечная сторона»)
  geometry: v.object({                               // область зоны — полигон
    points: v.array(v.array(v.number())),            // [[x, y], ...] — метры
  }),
  condition: v.string(),                             // "sunny" | "partial_shade" | "shade"
  style: v.optional(v.object({                       // визуальный стиль
    color: v.optional(v.string()),                   // цвет заливки
    opacity: v.optional(v.number()),                 // прозрачность (0–1)
  })),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_garden", ["gardenId"]),
```

| Поле | Тип | Обяз. | Описание |
|---|---|---|---|
| `gardenId` | `v.id("gardens")` | ✅ | Участок |
| `name` | `v.optional(v.string())` | — | Название зоны |
| `geometry` | `v.object()` | ✅ | Полигон зоны: `{ points: [[x,y],...] }` в метрах |
| `condition` | `v.string()` | ✅ | `"sunny"` (солнце) / `"partial_shade"` (полутень) / `"shade"` (тень) |
| `style` | `v.optional(v.object())` | — | Цвет, прозрачность |

---

### 2.5. `moistureZones` — Зона влажности

**Слой «влажность».** Независим от слоя освещённости (Q4).

```typescript
moistureZones: defineTable({
  gardenId: v.id("gardens"),                         // участок
  name: v.optional(v.string()),                      // название («Сырой угол»)
  geometry: v.object({                               // область зоны — полигон
    points: v.array(v.array(v.number())),            // [[x, y], ...] — метры
  }),
  condition: v.string(),                             // "dry" | "moderate" | "wet"
  style: v.optional(v.object({                       // визуальный стиль
    color: v.optional(v.string()),
    opacity: v.optional(v.number()),
  })),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_garden", ["gardenId"]),
```

| Поле | Тип | Обяз. | Описание |
|---|---|---|---|
| `gardenId` | `v.id("gardens")` | ✅ | Участок |
| `name` | `v.optional(v.string())` | — | Название зоны |
| `geometry` | `v.object()` | ✅ | Полигон зоны: `{ points: [[x,y],...] }` в метрах |
| `condition` | `v.string()` | ✅ | `"dry"` (сухо) / `"moderate"` (умеренно) / `"wet"` (влажно) |
| `style` | `v.optional(v.object())` | — | Цвет, прозрачность |

> **Почему две таблицы, а не одна (Q4):** Слои света и влажности не совпадают геометрически — солнечный участок может быть сухим в одном углу и влажным в другом. Объединение в одну таблицу с двумя атрибутами на полигон привело бы к дублированию или разрезанию зон. Две независимые таблицы — чище и точнее.

---

### 2.6. `plants` — Растение (персональный справочник)

Растение — справочная карточка пользователя. Не привязана к месту. Описывает, *что* это за растение.

```typescript
plants: defineTable({
  userId: v.id("users"),                             // владелец (персональный справочник)
  plantType: v.string(),                             // "tree" | "shrub" | "perennial" | "annual"
  name: v.string(),                                  // «Томат», «Яблоня»
  variety: v.optional(v.string()),                   // «Бычье сердце», «Антоновка»
  description: v.optional(v.string()),               // заметки о растении
  catalogId: v.optional(v.string()),                 // задел под глобальный каталог (Q3)
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_and_name", ["userId", "name"]),
```

| Поле | Тип | Обяз. | Описание |
|---|---|---|---|
| `userId` | `v.id("users")` | ✅ | Владелец (растение — персональный справочник) |
| `plantType` | `v.string()` | ✅ | `"tree"` (дерево) / `"shrub"` (кустарник) / `"perennial"` (многолетник) / `"annual"` (однолетник) |
| `name` | `v.string()` | ✅ | Название растения |
| `variety` | `v.optional(v.string())` | — | Сорт |
| `description` | `v.optional(v.string())` | — | Заметки |
| `catalogId` | `v.optional(v.string())` | — | **Задел под глобальный каталог** (Q3). В MVP не используется; в будущем — ссылка на внешнюю базу растений |

> **Почему персональный справочник (Q3):** На старте нет кураторской базы. Каждый пользователь создаёт свой справочник вручную. Поле `catalogId` — задел: после MVP можно добавить глобальный каталог и привязку к нему, не меняя модель.

---

### 2.7. `plantings` — Посадка (растение + место + период)

**Ключевая сущность.** Соединяет растение (`plants`), место на схеме (`schemaObjects`) и временной период. **История посадок сохраняется через эту сущность.**

```typescript
plantings: defineTable({
  gardenId: v.id("gardens"),                         // участок
  plantId: v.id("plants"),                           // какое растение посажено
  schemaObjectId: v.optional(v.id("schemaObjects")), // объект схемы (грядка, клумба). Может быть null
  positionNote: v.optional(v.string()),              // текстовое уточнение позиции (Q5): «северный край грядки»
  plantedAt: v.number(),                             // дата посадки (мс от epoch)
  status: v.string(),                                // "active" | "relocated" | "dead" | "completed"
  endedAt: v.optional(v.number()),                   // дата завершения (гибель, пересадка, сбор)
  relocatedToPlantingId: v.optional(v.id("plantings")), // ссылка старая→новая посадка (Q1)
  quantity: v.optional(v.number()),                  // количество (5 кустов)
  notes: v.optional(v.string()),                     // заметки при посадке
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_garden", ["gardenId"])
  .index("by_garden_and_status", ["gardenId", "status"])
  .index("by_schema_object", ["schemaObjectId", "plantedAt"])
  .index("by_plant", ["plantId"]),
```

| Поле | Тип | Обяз. | Описание |
|---|---|---|---|
| `gardenId` | `v.id("gardens")` | ✅ | Участок |
| `plantId` | `v.id("plants")` | ✅ | Какое растение посажено |
| `schemaObjectId` | `v.optional(v.id("schemaObjects"))` | — | Объект схемы, к которому привязана посадка (грядка, клумба) |
| `positionNote` | `v.optional(v.string())` | — | Текстовое уточнение позиции (Q5): «северный край грядки», «у забора». Подзоны не реализуются |
| `plantedAt` | `v.number()` | ✅ | Дата посадки |
| `status` | `v.string()` | ✅ | Текущий статус (см. ниже) |
| `endedAt` | `v.optional(v.number())` | — | Дата завершения посадки |
| `relocatedToPlantingId` | `v.optional(v.id("plantings"))` | — | **Ссылка на новую посадку** при пересадке (Q1). Цепочка восстанавливается проходом по ссылкам |
| `quantity` | `v.optional(v.number())` | — | Количество экземпляров |
| `notes` | `v.optional(v.string())` | — | Заметки |
| `createdAt` | `v.number()` | ✅ | |
| `updatedAt` | `v.number()` | ✅ | |

**Допустимые значения `status`:**

| Значение | Описание | `endedAt` |
|---|---|---|
| `"active"` | Растёт сейчас | — |
| `"relocated"` | Пересажено на другое место | дата пересадки |
| `"dead"` | Погибло | дата гибели |
| `"completed"` | Завершено (однолетник убран, урожай собран) | дата завершения |

> **Привязка к месту:** Посадка ссылается на `schemaObjectId` (грядка, клумба). Текстовое уточнение — через `positionNote`. Подзоны не реализуются (Q5).

---

### 2.8. `journalEvents` — Событие журнала

Каждое событие журнала **допускает заметку (`description`) и фото** независимо от типа (Q6).

```typescript
journalEvents: defineTable({
  plantingId: v.id("plantings"),                     // к какой посадке относится
  eventType: v.string(),                             // тип события (12 типов, см. ниже)
  eventDate: v.number(),                             // дата события (мс от epoch)
  title: v.optional(v.string()),                     // краткий заголовок («Зацвели первые цветы»)
  description: v.optional(v.string()),               // заметка — доступна для ВСЕХ типов (Q6)
  metadata: v.optional(v.object({                    // доп. данные в зависимости от типа (Q8)
    weather: v.optional(v.object({                   // погода во время события (Q8)
      temperature: v.optional(v.number()),           // температура, °C
      condition: v.optional(v.string()),             // "sunny" | "cloudy" | "rainy" | "snowy" | ...
    })),
    harvest: v.optional(v.object({                   // данные урожая (Q12)
      quantity: v.optional(v.number()),              // количество (опционально)
      unit: v.optional(v.string()),                  // единица — свободный текст: «кг», «шт», «вёдер»
    })),
    diagnosis: v.optional(v.string()),               // диагноз болезни
    severity: v.optional(v.string()),                // степень тяжести: "mild" | "moderate" | "severe"
    notes: v.optional(v.string()),                   // прочие доп. заметки
  })),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_planting", ["plantingId", "eventDate"])
  .index("by_planting_and_type", ["plantingId", "eventType"]),
```

| Поле | Тип | Обяз. | Описание |
|---|---|---|---|
| `plantingId` | `v.id("plantings")` | ✅ | Посадка, к которой относится событие |
| `eventType` | `v.string()` | ✅ | Тип события (см. ниже) |
| `eventDate` | `v.number()` | ✅ | Дата события |
| `title` | `v.optional(v.string())` | — | Краткий заголовок |
| `description` | `v.optional(v.string())` | — | Заметка — **доступна для всех 12 типов** (Q6) |
| `metadata` | `v.optional(v.object())` | — | Доп. данные: погода, урожай, диагноз и т.д. (Q8, Q12) |
| `createdAt` | `v.number()` | ✅ | |
| `updatedAt` | `v.number()` | ✅ | |

**Допустимые значения `eventType` (12 типов, Q6):**

| Значение | Описание | Спец. поля в `metadata` |
|---|---|---|
| `"planting"` | Посадка (создаётся автоматически при создании `plantings`) | — |
| `"watering"` | Полив | — |
| `"blooming"` | Цветение | — |
| `"fruiting"` | Плодоношение | — |
| `"harvest"` | Урожай | `metadata.harvest: { quantity?, unit? }` (Q12) |
| `"pruning"` | Обрезка | — |
| `"disease"` | Болезнь | `metadata.diagnosis`, `metadata.severity` |
| `"pest"` | Вредитель | `metadata.diagnosis`, `metadata.severity` |
| `"fertilizing"` | Подкормка / удобрение | — |
| `"transplant"` | Пересадка (создаётся автоматически при пересадке) | — |
| `"death"` | Гибель (создаётся автоматически при статусе `"dead"`) | `metadata.diagnosis` |
| `"other"` | Другое | — |

> **Прополка и мульчирование** отдельными типами не добавляются (Q6). Используйте `"other"` с заметкой.
>
> **Погода (Q8):** Записывается в `metadata.weather` — вложенный объект с температурой и состоянием.
>
> **Урожай (Q12):** Единицы — свободный текст (`unit: "кг"`, `"шт"`, `"вёдер"`), количество — опциональное число.

---

### 2.9. `photos` — Фото

Фото — полиморфная сущность: может принадлежать посадке, событию журнала или объекту схемы. Файлы хранятся в **Convex File Storage** (Q10).

```typescript
photos: defineTable({
  ownerType: v.string(),                             // "planting" | "journalEvent" | "schemaObject"
  ownerId: v.string(),                               // Id связанной сущности (Convex Id как строка)
  storageId: v.id("_storage"),                       // ссылка на файл в Convex File Storage (Q10)
  caption: v.optional(v.string()),                   // подпись к фото
  width: v.optional(v.number()),                     // ширина оригинала (px)
  height: v.optional(v.number()),                    // высота оригинала (px)
  fileSize: v.optional(v.number()),                  // размер файла (bytes)
  createdAt: v.number(),                             // дата загрузки
})
  .index("by_owner", ["ownerType", "ownerId"])
  .index("by_storage", ["storageId"]),
```

| Поле | Тип | Обяз. | Описание |
|---|---|---|---|
| `ownerType` | `v.string()` | ✅ | Тип владельца: `"planting"` / `"journalEvent"` / `"schemaObject"` |
| `ownerId` | `v.string()` | ✅ | Id связанной сущности (Convex `Id` в строковом представлении) |
| `storageId` | `v.id("_storage")` | ✅ | **Ссылка на файл в Convex File Storage** (Q10). Заменяет S3-ключи |
| `caption` | `v.optional(v.string())` | — | Подпись |
| `width` | `v.optional(v.number())` | — | Ширина (px) |
| `height` | `v.optional(v.number())` | — | Высота (px) |
| `fileSize` | `v.optional(v.number())` | — | Размер файла (bytes) |
| `createdAt` | `v.number()` | ✅ | Дата загрузки |

> **Convex File Storage (Q10):** URL файла получается через `ctx.storage.getUrl(storageId)`. Удаление — **hard delete** через `ctx.storage.delete(storageId)` (см. раздел 3.4).

---

### 2.10. `_storage` — Convex File Storage (встроенная таблица)

Эта таблица управляется Convex автоматически. При загрузке файла создаётся документ с `Id`, который сохраняется в `photos.storageId`.

| Операция | Convex API |
|---|---|
| Получить URL загрузки | `ctx.storage.generateUploadUrl()` → `uploadUrl` |
| Клиент загружает файл | `POST uploadUrl` → возвращает `{ storageId }` |
| Получить URL для отображения | `ctx.storage.getUrl(storageId)` → `url \| null` |
| Удалить файл (**hard delete**) | `ctx.storage.delete(storageId)` |

---

## 3. Инварианты и бизнес-правила

### 3.1. Сохранение истории посадок

```
Пользователь сажает помидор на Грядке №1 (2024-05-10)
    → создаётся planting #1: status="active", schemaObjectId=Грядка №1
    → автоматически создаётся journalEvent: eventType="planting"

Через месяц помидор заболел (2024-06-15)
    → создаётся journalEvent: eventType="disease", plantingId=#1

В августе урожай (2024-08-20)
    → создаётся journalEvent: eventType="harvest", plantingId=#1
    → metadata.harvest: { quantity: 3.5, unit: "кг" }

Осенью помидор убран (2024-09-30)
    → planting #1: status="completed", endedAt=2024-09-30
```

**На следующий год:**
```
Пользователь сажает перец на той же Грядке №1 (2025-05-15)
    → создаётся planting #2: status="active", schemaObjectId=Грядка №1
    → planting #1 остаётся в истории (status="completed")
```

**Запрос «Что росло на этом месте?»** — см. `getPlantingHistory` в разделе 4.

### 3.2. Пересадка

```
Пользователь пересаживает яблоню с одного места на другое (2025-04-01):

  1. planting #3 (яблоня, старое место):
     → status="relocated", endedAt=2025-04-01
     → relocatedToPlantingId = #4 (ссылка на новую посадку)

  2. planting #4 (яблоня, новое место):
     → status="active", plantedAt=2025-04-01

  3. journalEvent: eventType="transplant", plantingId=#3
```

**Восстановление цепочки пересадок (Q1):**

Цепочка восстанавливается проходом по ссылкам `relocatedToPlantingId` (старая → новая). Таблица-связка не нужна.

```
planting #3 (relocated) → relocatedToPlantingId → planting #4 (relocated) → relocatedToPlantingId → planting #5 (active)
```

Пример реализации — см. `getTransplantChain` в разделе 4.

### 3.3. Гибель

```
Растение погибло (2025-07-10):
    planting #5: status="dead", endedAt=2025-07-10
    journalEvent: eventType="death", description="Засохло после засухи"
    metadata.diagnosis="засуха" (опционально)
```

### 3.4. Удаление данных пользователем

| Действие | Что происходит |
|---|---|
| **Удалить фото** | **Hard delete**: `ctx.storage.delete(storageId)` удаляет файл из Convex File Storage, затем `ctx.db.delete(photoId)` удаляет запись (Q10) |
| **Удалить событие журнала** | Запись удаляется. Фото события удаляются (hard delete из File Storage). Требуется подтверждение |
| **Удалить посадку** | **Невозможно** через UI. Посадка может быть только закрыта (`"completed"` / `"dead"` / `"relocated"`). Физическое удаление — только администратором |
| **Удалить объект схемы** | Если у объекта есть посадки (активные или исторические) — нельзя удалить, только переименовать / скрыть |
| **Удалить участок** | Модель поддерживает несколько участков (Q9). Удаление — каскадное: все дочерние объекты, зоны, посадки, события, фото |

> **Hard delete (Q10):** Удаление фото всегда физическое — файл удаляется из Convex File Storage через `ctx.storage.delete()`. Мягкого удаления (soft delete) для фото нет.

---

## 4. Примеры queries / mutations

> Все функции реализуются в директории `convex/`. Каждая функция — отдельный файл (или группа файлов).

### 4.1. Query: история посадок на объекте схемы

«Что росло на этом месте?»

```typescript
// convex/plantings/getHistory.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getHistory = query({
  args: { schemaObjectId: v.id("schemaObjects") },
  handler: async (ctx, args) => {
    const plantings = await ctx.db
      .query("plantings")
      .withIndex("by_schema_object", (q) =>
        q.eq("schemaObjectId", args.schemaObjectId)
      )
      .collect();

    // Сортировка по plantedAt (не по _creationTime) —
    // пользователи вносят исторические данные задним числом
    return plantings.sort((a, b) => b.plantedAt - a.plantedAt);
  },
});
```

### 4.2. Query: активные посадки на участке

```typescript
// convex/plantings/getActive.ts
export const getActive = query({
  args: { gardenId: v.id("gardens") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("plantings")
      .withIndex("by_garden_and_status", (q) =>
        q.eq("gardenId", args.gardenId).eq("status", "active")
      )
      .collect();
  },
});
```

### 4.3. Query: лента событий посадки

```typescript
// convex/journalEvents/getByPlanting.ts
export const getByPlanting = query({
  args: { plantingId: v.id("plantings") },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("journalEvents")
      .withIndex("by_planting", (q) =>
        q.eq("plantingId", args.plantingId)
      )
      .collect();

    // Сортировка по eventDate (не по _creationTime) —
    // события могут вноситься задним числом
    return events.sort((a, b) => b.eventDate - a.eventDate);
  },
});
```

### 4.4. Mutation: создать посадку

```typescript
// convex/plantings/create.ts
export const create = mutation({
  args: {
    gardenId: v.id("gardens"),
    plantId: v.id("plants"),
    schemaObjectId: v.optional(v.id("schemaObjects")),
    positionNote: v.optional(v.string()),
    plantedAt: v.number(),
    quantity: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // 1. Создать посадку
    const plantingId = await ctx.db.insert("plantings", {
      ...args,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    // 2. Автоматически создать событие "planting"
    await ctx.db.insert("journalEvents", {
      plantingId,
      eventType: "planting",
      eventDate: args.plantedAt,
      title: "Посадка",
      createdAt: now,
      updatedAt: now,
    });

    return plantingId;
  },
});
```

### 4.5. Mutation: пересадка

```typescript
// convex/plantings/transplant.ts
export const transplant = mutation({
  args: {
    plantingId: v.id("plantings"),
    newSchemaObjectId: v.optional(v.id("schemaObjects")),
    newPositionNote: v.optional(v.string()),
    transplantDate: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oldPlanting = await ctx.db.get(args.plantingId);
    if (!oldPlanting) throw new Error("Посадка не найдена");

    // 1. Закрыть старую посадку
    await ctx.db.patch(args.plantingId, {
      status: "relocated",
      endedAt: args.transplantDate,
      updatedAt: now,
    });

    // 2. Создать новую посадку
    const newPlantingId = await ctx.db.insert("plantings", {
      gardenId: oldPlanting.gardenId,
      plantId: oldPlanting.plantId,
      schemaObjectId: args.newSchemaObjectId,
      positionNote: args.newPositionNote,
      plantedAt: args.transplantDate,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    // 3. Связать: старая → новая (Q1)
    await ctx.db.patch(args.plantingId, {
      relocatedToPlantingId: newPlantingId,
    });

    // 4. Создать событие "transplant"
    await ctx.db.insert("journalEvents", {
      plantingId: args.plantingId,
      eventType: "transplant",
      eventDate: args.transplantDate,
      description: "Пересажено на новое место",
      createdAt: now,
      updatedAt: now,
    });

    return newPlantingId;
  },
});
```

### 4.6. Query: восстановить цепочку пересадок

```typescript
// convex/plantings/getTransplantChain.ts
export const getTransplantChain = query({
  args: { plantingId: v.id("plantings") },
  handler: async (ctx, args) => {
    const chain = [];
    let current = await ctx.db.get(args.plantingId);
    if (!current) return chain;

    // Проход по ссылкам relocatedToPlantingId (старая → новая)
    while (current.relocatedToPlantingId) {
      const next = await ctx.db.get(current.relocatedToPlantingId);
      if (!next) break;
      chain.push(next);
      current = next;
    }

    return chain;
  },
});
```

### 4.7. Mutation: загрузка фото

Двухшаговый процесс: генерация URL → сохранение записи.

```typescript
// convex/photos/generateUploadUrl.ts
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

// convex/photos/save.ts
export const save = mutation({
  args: {
    storageId: v.id("_storage"),
    ownerType: v.string(),      // "planting" | "journalEvent" | "schemaObject"
    ownerId: v.string(),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("photos", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
```

```typescript
// convex/photos/getUrl.ts
export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
```

### 4.8. Mutation: удалить фото (hard delete)

```typescript
// convex/photos/remove.ts
export const remove = mutation({
  args: { photoId: v.id("photos") },
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.photoId);
    if (!photo) throw new Error("Фото не найдено");

    // 1. Hard delete файла из Convex File Storage (Q10)
    await ctx.storage.delete(photo.storageId);

    // 2. Удалить запись из таблицы photos
    await ctx.db.delete(args.photoId);
  },
});
```

### 4.9. Query: зоны участка (оба слоя)

```typescript
// convex/zones/getByGarden.ts
export const getByGarden = query({
  args: { gardenId: v.id("gardens") },
  handler: async (ctx, args) => {
    const [lightZones, moistureZones] = await Promise.all([
      ctx.db
        .query("lightZones")
        .withIndex("by_garden", (q) => q.eq("gardenId", args.gardenId))
        .collect(),
      ctx.db
        .query("moistureZones")
        .withIndex("by_garden", (q) => q.eq("gardenId", args.gardenId))
        .collect(),
    ]);

    return { lightZones, moistureZones };
  },
});
```

---

## 5. ER-диаграмма

```
users (1) ──────────────── (∞) gardens
                               │
                               │ 1:∞
                    ┌──────────┼──────────────────────┐
                    │          │                      │
                    ▼          ▼                      ▼
           (∞) schemaObjects  (∞) lightZones     (∞) moistureZones
                    │          (зоны света)        (зоны влаги)
                    │ 1:∞                           Q4: независимые слои
                    ▼
           (∞) plantings ◄────── relocatedToPlantingId (self-ref, Q1)
                    │  ↑                  старая → новая
                    │  └──────────────────
                    │
           ┌────────┼────────┐
           ▼        ▼        ▼
  (∞) plants  (∞) journalEvents  (∞) photos
  (справочник)  │                   │
     ↑          │ metadata:         │ ownerType + ownerId
     │          │  weather (Q8)     │ (полиморфная связь)
     │          │  harvest (Q12)    │
     │          │                   ▼
     └──────────┘              _storage
     plantId                   (Convex File Storage)
                               photos.storageId → _storage (Q10)

  photos.ownerType: "planting" | "journalEvent" | "schemaObject"
```

**Связи:**

| От | К | Тип | Через |
|---|---|---|---|
| `users` | `gardens` | 1:∞ | `gardens.ownerId` |
| `gardens` | `schemaObjects` | 1:∞ | `schemaObjects.gardenId` |
| `gardens` | `lightZones` | 1:∞ | `lightZones.gardenId` |
| `gardens` | `moistureZones` | 1:∞ | `moistureZones.gardenId` |
| `gardens` | `plantings` | 1:∞ | `plantings.gardenId` |
| `users` | `plants` | 1:∞ | `plants.userId` |
| `plants` | `plantings` | 1:∞ | `plantings.plantId` |
| `schemaObjects` | `plantings` | 1:∞ | `plantings.schemaObjectId` (опц.) |
| `plantings` | `plantings` | self | `plantings.relocatedToPlantingId` (опц., Q1) |
| `plantings` | `journalEvents` | 1:∞ | `journalEvents.plantingId` |
| `photos` | `_storage` | ∞:1 | `photos.storageId` |
| `photos` | `plantings` / `journalEvents` / `schemaObjects` | ∞:1 | `photos.ownerType` + `photos.ownerId` (полиморфно) |

---

## 6. Сводная таблица: все таблицы и индексы

| Таблица | Назначение | Индексы |
|---|---|---|
| `users` | Пользователи | `by_email` → `["email"]` |
| `gardens` | Участки | `by_owner` → `["ownerId"]` |
| `schemaObjects` | Объекты схемы | `by_garden` → `["gardenId"]`; `by_garden_and_type` → `["gardenId", "type"]` |
| `lightZones` | Зоны освещённости (Q4) | `by_garden` → `["gardenId"]` |
| `moistureZones` | Зоны влажности (Q4) | `by_garden` → `["gardenId"]` |
| `plants` | Растения (справочник) | `by_user` → `["userId"]`; `by_user_and_name` → `["userId", "name"]` |
| `plantings` | Посадки | `by_garden` → `["gardenId"]`; `by_garden_and_status` → `["gardenId", "status"]`; `by_schema_object` → `["schemaObjectId", "plantedAt"]`; `by_plant` → `["plantId"]` |
| `journalEvents` | События журнала | `by_planting` → `["plantingId", "eventDate"]`; `by_planting_and_type` → `["plantingId", "eventType"]` |
| `photos` | Фото | `by_owner` → `["ownerType", "ownerId"]`; `by_storage` → `["storageId"]` |
| `_storage` | Convex File Storage (встроенная) | управляется Convex автоматически |

**Итого:** 9 бизнес-таблиц + 1 встроенная (`_storage`). 14 индексов.

---

## Чек-лист учёта ответов заказчика

| Вопрос | Решение | Где учтено |
|---|---|---|
| **Q1** relocated_to_planting_id | Простая ссылка `relocatedToPlantingId`, проход по ссылкам | §2.7, §3.2, §4.6 |
| **Q2** Координаты в метрах | `geometry.points: [[x,y],...]`, `originGps` опц. у Garden | §2.2, §2.3, §2.4, §2.5 |
| **Q3** Персональный справочник + catalog_id | `plants.catalogId` (опц.) | §2.6 |
| **Q4** Два независимых слоя зон | `lightZones` и `moistureZones` — отдельные таблицы | §2.4, §2.5 |
| **Q5** Подзоны не делаем | `plantings.positionNote` (опц. текст) | §2.7 |
| **Q6** 12 типов событий, каждый с заметкой и фото | `description` доступен всем типам, фото через `photos` | §2.8 |
| **Q7** Роль «Зритель» после MVP | `users.role` — `"owner"` в MVP | §2.1 |
| **Q8** Погода в metadata | `metadata.weather` (вложенный объект) | §2.8 |
| **Q9** Несколько участков | Модель поддерживает, UI ограничивает одним | §2.2 |
| **Q10** Hard delete из File Storage | `ctx.storage.delete()` | §2.9, §3.4, §4.8 |
| **Q11** MVP — только русский | `users.locale: "ru"` | §2.1 |
| **Q12** Единицы урожая — текст + число | `metadata.harvest: { quantity?, unit? }` | §2.8 |

---

*Документ: ARCHITECTURE.md · Версия: 1.0 · Стек: Convex · Дата: 2026-07-16*
