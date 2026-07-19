/**
 * pbPlantings — клиентский аналог convex/plantings.ts бизнес-логики для
 * PocketBase (задачи C.3/C.4): авто-события журнала при создании/закрытии/
 * пересадке посадки, подстановка карточки растения (withPlant), история
 * места. PocketBase — CRUD без serverless-мутаций, поэтому многошаговые
 * операции (create+auto-event, close+auto-event, transplant close+create+link)
 * выполняются как последовательность клиентских запросов — НЕ атомарно
 * (см. README-PocketBase.md, тот же компромисс, что в pbBackup.ts).
 */
import {
  plants as plantsApi,
  plantings as plantingsApi,
  schemaObjects as schemaObjectsApi,
  journalEvents as journalEventsApi,
  type Plant,
  type Planting,
  type SchemaObject,
  type EventType,
} from "./pb";

export interface PlantingWithPlant extends Planting {
  plant: Plant | null;
}

export interface PlantingWithDetails extends PlantingWithPlant {
  schemaObject: SchemaObject | null;
}

async function withPlant(planting: Planting): Promise<PlantingWithPlant> {
  let plant: Plant | null = null;
  try {
    plant = await plantsApi.getOne(planting.plantId);
  } catch {
    plant = null;
  }
  return { ...planting, plant };
}

/** Активные посадки на участке (convex/plantings.ts getActive) — с карточками растений. */
export async function getActive(gardenId: string): Promise<PlantingWithPlant[]> {
  const list = await plantingsApi.list({ filter: `gardenId="${gardenId}" && status="active"` });
  return Promise.all(list.map(withPlant));
}

/** История посадок на объекте схемы, свежие сверху (convex/plantings.ts getHistory). */
export async function getHistory(schemaObjectId: string): Promise<PlantingWithPlant[]> {
  const list = await plantingsApi.list({ filter: `schemaObjectId="${schemaObjectId}"` });
  list.sort((a, b) => new Date(b.plantedAt).getTime() - new Date(a.plantedAt).getTime());
  return Promise.all(list.map(withPlant));
}

/** Посадка по id — с карточкой растения и объекта схемы (convex/plantings.ts getById). */
export async function getById(plantingId: string): Promise<PlantingWithDetails | null> {
  let planting: Planting;
  try {
    planting = await plantingsApi.getOne(plantingId);
  } catch {
    return null;
  }
  const withP = await withPlant(planting);
  let schemaObject: SchemaObject | null = null;
  if (planting.schemaObjectId) {
    try {
      schemaObject = await schemaObjectsApi.getOne(planting.schemaObjectId);
    } catch {
      schemaObject = null;
    }
  }
  return { ...withP, schemaObject };
}

async function insertAutoEvent(
  plantingId: string,
  eventType: EventType,
  eventDate: string,
  title: string,
  description?: string,
): Promise<void> {
  await journalEventsApi.create({ plantingId, eventType, eventDate, title, description });
}

/** Создать посадку + авто-событие "planting" (convex/plantings.ts create). */
export async function createPlanting(args: {
  gardenId: string;
  plantId: string;
  schemaObjectId?: string;
  positionNote?: string;
  plantedAt: string;
  quantity?: number;
  notes?: string;
}): Promise<Planting> {
  const created = await plantingsApi.create({ ...args, status: "active" });
  await insertAutoEvent(created.id, "planting", args.plantedAt, "Посадка");
  return created;
}

/** Закрыть посадку: "dead" или "completed" + авто-событие (convex/plantings.ts close). */
export async function closePlanting(args: {
  plantingId: string;
  status: "dead" | "completed";
  endedAt: string;
  description?: string;
}): Promise<void> {
  await plantingsApi.update(args.plantingId, { status: args.status, endedAt: args.endedAt });
  if (args.status === "dead") {
    await insertAutoEvent(args.plantingId, "death", args.endedAt, "Гибель", args.description);
  } else {
    await insertAutoEvent(args.plantingId, "other", args.endedAt, "Посадка завершена", args.description);
  }
}

/** Пересадка: закрыть старую, создать новую, связать, авто-событие (convex/plantings.ts transplant). */
export async function transplantPlanting(args: {
  plantingId: string;
  newSchemaObjectId?: string;
  newPositionNote?: string;
  transplantDate: string;
}): Promise<Planting> {
  const oldPlanting = await plantingsApi.getOne(args.plantingId);

  await plantingsApi.update(args.plantingId, { status: "relocated", endedAt: args.transplantDate });

  const created = await plantingsApi.create({
    gardenId: oldPlanting.gardenId,
    plantId: oldPlanting.plantId,
    schemaObjectId: args.newSchemaObjectId,
    positionNote: args.newPositionNote,
    plantedAt: args.transplantDate,
    status: "active",
    quantity: oldPlanting.quantity,
  });

  await plantingsApi.update(args.plantingId, { relocatedToPlantingId: created.id });
  await insertAutoEvent(args.plantingId, "transplant", args.transplantDate, "Пересадка", "Пересажено на новое место");

  return created;
}
