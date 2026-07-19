/**
 * In-memory хранилище для E2E-тестов (vite --mode e2e).
 *
 * Подменяет Convex-backend: таблицы в памяти вкладки, обработчики
 * повторяют семантику функций из convex/*.ts (упрощённо, один
 * пользователь user_1). Живой Convex-деплой не нужен.
 *
 * Сид данных: страница открыта с ?e2e-seed — участок, растение,
 * грядка, активная посадка и запись журнала.
 */

type Doc = Record<string, unknown> & { _id: string; _creationTime: number };

const TABLES = [
  "gardens",
  "plants",
  "plantings",
  "schemaObjects",
  "lightZones",
  "moistureZones",
  "journalEvents",
  "photos",
] as const;

type TableName = (typeof TABLES)[number];

const USER_ID = "user_1";

const db: Record<TableName, Doc[]> = Object.fromEntries(
  TABLES.map((t) => [t, []]),
) as Record<TableName, Doc[]>;

let seq = 0;

function insert(table: TableName, fields: Record<string, unknown>): Doc {
  const doc: Doc = { ...fields, _id: `${table}_${++seq}`, _creationTime: Date.now() };
  db[table].push(doc);
  return doc;
}

function get(table: TableName, id: unknown): Doc | null {
  return db[table].find((d) => d._id === id) ?? null;
}

function patch(table: TableName, id: unknown, fields: Record<string, unknown>) {
  const doc = get(table, id);
  if (doc) Object.assign(doc, fields, { updatedAt: Date.now() });
}

function del(table: TableName, id: unknown) {
  const i = db[table].findIndex((d) => d._id === id);
  if (i >= 0) db[table].splice(i, 1);
}

// ─── Подписка (для useSyncExternalStore в моке useQuery) ──────────

let version = 0;
const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getVersion(): number {
  return version;
}

function notify() {
  version++;
  queryCache.clear();
  for (const l of [...listeners]) l();
}

// ─── Авторизация ──────────────────────────────────────────────────

export const authState = {
  get authed(): boolean {
    return sessionStorage.getItem("e2e-authed") === "1";
  },
};

export function setAuthed(value: boolean) {
  sessionStorage.setItem("e2e-authed", value ? "1" : "0");
  notify();
}

// ─── Обработчики запросов ─────────────────────────────────────────

function withPlant(planting: Doc) {
  return { ...planting, plant: get("plants", planting.plantId) };
}

type Handler = (args: Record<string, unknown>) => unknown;

const queries: Record<string, Handler> = {
  "gardens:listMine": () => [...db.gardens].reverse(),
  "gardens:getById": (a) => get("gardens", a.gardenId),
  "stats:getStreak": () => ({ days: 0, hasToday: false }),
  "plants:listMine": () => [...db.plants],
  "schemaObjects:listByGarden": (a) =>
    db.schemaObjects.filter((o) => o.gardenId === a.gardenId),
  "zones:getByGarden": (a) => ({
    lightZones: db.lightZones.filter((z) => z.gardenId === a.gardenId),
    moistureZones: db.moistureZones.filter((z) => z.gardenId === a.gardenId),
  }),
  "plantings:getActive": (a) =>
    db.plantings
      .filter((p) => p.gardenId === a.gardenId && p.status === "active")
      .map(withPlant),
  "plantings:getHistory": (a) =>
    db.plantings
      .filter((p) => p.schemaObjectId === a.schemaObjectId)
      .sort((x, y) => (y.plantedAt as number) - (x.plantedAt as number))
      .map(withPlant),
  "plantings:getById": (a) => {
    const planting = get("plantings", a.plantingId);
    if (!planting) return null;
    return {
      ...withPlant(planting),
      schemaObject: planting.schemaObjectId
        ? get("schemaObjects", planting.schemaObjectId)
        : null,
    };
  },
  "plantings:getTransplantChain": () => [],
  "journalEvents:getByPlanting": (a) =>
    db.journalEvents
      .filter((e) => e.plantingId === a.plantingId)
      .sort((x, y) => (y.eventDate as number) - (x.eventDate as number)),
  "photos:listByOwner": () => [],
};

// ─── Обработчики мутаций ──────────────────────────────────────────

function autoEvent(
  plantingId: string,
  eventType: string,
  eventDate: number,
  title: string,
  description?: string,
) {
  const now = Date.now();
  insert("journalEvents", {
    plantingId,
    eventType,
    eventDate,
    title,
    description,
    createdAt: now,
    updatedAt: now,
  });
}

const mutations: Record<string, Handler> = {
  "gardens:create": (a) => {
    if (db.gardens.length > 0) {
      throw new Error("У вас уже есть участок. В MVP доступен только один.");
    }
    const now = Date.now();
    const boundary =
      a.width && a.length
        ? {
            points: [
              [0, 0],
              [a.width, 0],
              [a.width, a.length],
              [0, a.length],
            ],
          }
        : undefined;
    return insert("gardens", {
      ownerId: USER_ID,
      name: a.name,
      description: a.description,
      boundary,
      createdAt: now,
      updatedAt: now,
    })._id;
  },
  "gardens:remove": (a) => {
    const objIds = db.schemaObjects
      .filter((o) => o.gardenId === a.gardenId)
      .map((o) => o._id);
    const plantingIds = db.plantings
      .filter((p) => p.gardenId === a.gardenId)
      .map((p) => p._id);
    db.schemaObjects = db.schemaObjects.filter((o) => !objIds.includes(o._id));
    db.lightZones = db.lightZones.filter((z) => z.gardenId !== a.gardenId);
    db.moistureZones = db.moistureZones.filter((z) => z.gardenId !== a.gardenId);
    db.journalEvents = db.journalEvents.filter(
      (e) => !plantingIds.includes(e.plantingId as string),
    );
    db.plantings = db.plantings.filter((p) => p.gardenId !== a.gardenId);
    del("gardens", a.gardenId);
    return null;
  },
  "plants:create": (a) => {
    const now = Date.now();
    return insert("plants", { userId: USER_ID, ...a, createdAt: now, updatedAt: now })._id;
  },
  "plants:update": (a) => {
    const { plantId, ...fields } = a;
    patch("plants", plantId, fields);
    return null;
  },
  "plants:remove": (a) => {
    if (db.plantings.some((p) => p.plantId === a.plantId)) {
      throw new Error(
        "По этому растению есть записи о посадках — удалить его из справочника нельзя.",
      );
    }
    del("plants", a.plantId);
    return null;
  },
  "schemaObjects:create": (a) => {
    const now = Date.now();
    return insert("schemaObjects", { ...a, createdAt: now, updatedAt: now })._id;
  },
  "schemaObjects:update": (a) => {
    const { objectId, ...fields } = a;
    patch("schemaObjects", objectId, fields);
    return null;
  },
  "schemaObjects:remove": (a) => {
    if (db.plantings.some((p) => p.schemaObjectId === a.objectId)) {
      throw new Error(
        "На этом месте есть записи о посадках — списать его со схемы нельзя. История должна сохраниться.",
      );
    }
    del("schemaObjects", a.objectId);
    return null;
  },
  "zones:create": (a) => {
    const { layer, ...fields } = a;
    const table = layer === "light" ? "lightZones" : "moistureZones";
    const now = Date.now();
    return insert(table, { ...fields, createdAt: now, updatedAt: now })._id;
  },
  "zones:update": (a) => {
    const { layer, zoneId, ...fields } = a;
    patch(layer === "light" ? "lightZones" : "moistureZones", zoneId, fields);
    return null;
  },
  "zones:remove": (a) => {
    del(a.layer === "light" ? "lightZones" : "moistureZones", a.zoneId);
    return null;
  },
  "plantings:create": (a) => {
    const now = Date.now();
    const planting = insert("plantings", {
      ...a,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    autoEvent(planting._id, "planting", a.plantedAt as number, "Посадка");
    return planting._id;
  },
  "plantings:close": (a) => {
    const planting = get("plantings", a.plantingId);
    if (!planting) throw new Error("Посадка не найдена");
    if (planting.status !== "active") throw new Error("Эта посадка уже закрыта");
    patch("plantings", a.plantingId, { status: a.status, endedAt: a.endedAt });
    if (a.status === "dead") {
      autoEvent(
        planting._id,
        "death",
        a.endedAt as number,
        "Гибель",
        a.description as string | undefined,
      );
    } else {
      autoEvent(
        planting._id,
        "other",
        a.endedAt as number,
        "Посадка завершена",
        a.description as string | undefined,
      );
    }
    return null;
  },
  "plantings:transplant": (a) => {
    const old = get("plantings", a.plantingId);
    if (!old) throw new Error("Посадка не найдена");
    if (old.status !== "active")
      throw new Error("Пересадить можно только активную посадку");
    const now = Date.now();
    patch("plantings", a.plantingId, {
      status: "relocated",
      endedAt: a.transplantDate,
    });
    const fresh = insert("plantings", {
      gardenId: old.gardenId,
      plantId: old.plantId,
      schemaObjectId: a.newSchemaObjectId,
      positionNote: a.newPositionNote,
      plantedAt: a.transplantDate,
      status: "active",
      quantity: old.quantity,
      createdAt: now,
      updatedAt: now,
    });
    patch("plantings", a.plantingId, { relocatedToPlantingId: fresh._id });
    autoEvent(
      old._id,
      "transplant",
      a.transplantDate as number,
      "Пересадка",
      "Пересажено на новое место",
    );
    return fresh._id;
  },
  "journalEvents:create": (a) => {
    const now = Date.now();
    return insert("journalEvents", { ...a, createdAt: now, updatedAt: now })._id;
  },
  "journalEvents:update": (a) => {
    const { eventId, ...fields } = a;
    patch("journalEvents", eventId, fields);
    return null;
  },
  "journalEvents:remove": (a) => {
    del("journalEvents", a.eventId);
    return null;
  },
  "photos:generateUploadUrl": () => "https://e2e-mock.local/upload",
  "photos:save": (a) => insert("photos", { ...a, createdAt: Date.now() })._id,
  "photos:remove": (a) => {
    del("photos", a.photoId);
    return null;
  },
};

// ─── Выполнение (кэш на версию — стабильные ссылки между notify) ──

const queryCache = new Map<string, unknown>();

export function runQuery(name: string, args: Record<string, unknown>): unknown {
  const handler = queries[name];
  if (!handler) throw new Error(`E2E-мок: нет обработчика запроса ${name}`);
  const key = `${name}:${JSON.stringify(args)}`;
  if (!queryCache.has(key)) queryCache.set(key, handler(args));
  return queryCache.get(key);
}

export async function runMutation(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const handler = mutations[name];
  if (!handler) throw new Error(`E2E-мок: нет обработчика мутации ${name}`);
  const result = handler(args);
  notify();
  return result;
}

// ─── Сид данных (?e2e-seed) ───────────────────────────────────────

if (new URLSearchParams(window.location.search).has("e2e-seed")) {
  const now = Date.now();
  const day = 86_400_000;
  const garden = insert("gardens", {
    ownerId: USER_ID,
    name: "Тестовый участок",
    boundary: {
      points: [
        [0, 0],
        [20, 0],
        [20, 30],
        [0, 30],
      ],
    },
    createdAt: now,
    updatedAt: now,
  });
  const plant = insert("plants", {
    userId: USER_ID,
    plantType: "perennial",
    name: "Клубника",
    variety: "Виктория",
    createdAt: now,
    updatedAt: now,
  });
  const bed = insert("schemaObjects", {
    gardenId: garden._id,
    type: "bed",
    label: "Грядка у дома",
    geometry: {
      type: "polygon",
      points: [
        [2, 2],
        [18, 2],
        [18, 28],
        [2, 28],
      ],
    },
    createdAt: now,
    updatedAt: now,
  });
  const planting = insert("plantings", {
    gardenId: garden._id,
    plantId: plant._id,
    schemaObjectId: bed._id,
    plantedAt: now - day * 10,
    status: "active",
    quantity: 12,
    createdAt: now,
    updatedAt: now,
  });
  autoEvent(planting._id, "planting", now - day * 10, "Посадка");
}
