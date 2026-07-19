/**
 * pbBackup — клиентский аналог convex/gardens.ts (deletePhotosFor, remove) и
 * convex/backup.ts (getFullExport, restoreFromBackup) для PocketBase.
 *
 * PocketBase не имеет serverless-мутаций — каскадное удаление и бэкап/восстановление,
 * которые раньше были одной атомарной Convex-мутацией, здесь — последовательность
 * клиентских запросов. Это НЕ атомарно (в отличие от Convex): при обрыве связи
 * посередине операция может остаться частично выполненной. Для MVP-масштаба
 * (один участок на пользователя) риск невелик, но это открытое отличие от
 * прежнего поведения — см. README-PocketBase.md.
 */
import { pb, gardens as gardensApi, schemaObjects as schemaObjectsApi, lightZones as lightZonesApi, moistureZones as moistureZonesApi, plants as plantsApi, plantings as plantingsApi, journalEvents as journalEventsApi, photos as photosApi, type Garden, type SchemaObject, type LightZone, type MoistureZone, type Plant, type Planting, type JournalEvent } from "./pb";

/** Удалить все фото сущности (запись PocketBase; файл удаляется вместе с записью). */
export async function deletePhotosFor(ownerType: string, ownerId: string): Promise<void> {
  const list = await photosApi.list({ filter: `ownerType="${ownerType}" && ownerId="${ownerId}"` });
  for (const photo of list) await photosApi.remove(photo.id);
}

/** Каскадное удаление участка: объекты схемы, зоны, посадки, события журнала, все фото. */
export async function removeGardenCascade(gardenId: string): Promise<void> {
  const objects = await schemaObjectsApi.list({ filter: `gardenId="${gardenId}"` });
  for (const obj of objects) {
    await deletePhotosFor("schemaObject", obj.id);
    await schemaObjectsApi.remove(obj.id);
  }

  const lights = await lightZonesApi.list({ filter: `gardenId="${gardenId}"` });
  for (const zone of lights) await lightZonesApi.remove(zone.id);
  const moistures = await moistureZonesApi.list({ filter: `gardenId="${gardenId}"` });
  for (const zone of moistures) await moistureZonesApi.remove(zone.id);

  const plantings = await plantingsApi.list({ filter: `gardenId="${gardenId}"` });
  for (const planting of plantings) {
    const events = await journalEventsApi.list({ filter: `plantingId="${planting.id}"` });
    for (const event of events) {
      await deletePhotosFor("journalEvent", event.id);
      await journalEventsApi.remove(event.id);
    }
    await deletePhotosFor("planting", planting.id);
    await plantingsApi.remove(planting.id);
  }

  await gardensApi.remove(gardenId);
}

export interface FullExport {
  gardens: Garden[];
  schemaObjects: SchemaObject[];
  lightZones: LightZone[];
  moistureZones: MoistureZone[];
  plants: Plant[];
  plantings: Planting[];
  journalEvents: JournalEvent[];
}

/** Полный экспорт данных текущего пользователя (задача 31.3). */
export async function getFullExport(): Promise<FullExport> {
  const userId = pb.authStore.record?.id;
  if (!userId) {
    return { gardens: [], schemaObjects: [], lightZones: [], moistureZones: [], plants: [], plantings: [], journalEvents: [] };
  }

  const gardens = await gardensApi.list({ filter: `ownerId="${userId}"` });

  const schemaObjects: SchemaObject[] = [];
  const lightZones: LightZone[] = [];
  const moistureZones: MoistureZone[] = [];
  const plantings: Planting[] = [];
  for (const garden of gardens) {
    schemaObjects.push(...(await schemaObjectsApi.list({ filter: `gardenId="${garden.id}"` })));
    lightZones.push(...(await lightZonesApi.list({ filter: `gardenId="${garden.id}"` })));
    moistureZones.push(...(await moistureZonesApi.list({ filter: `gardenId="${garden.id}"` })));
    plantings.push(...(await plantingsApi.list({ filter: `gardenId="${garden.id}"` })));
  }

  const journalEvents: JournalEvent[] = [];
  for (const planting of plantings) {
    journalEvents.push(...(await journalEventsApi.list({ filter: `plantingId="${planting.id}"` })));
  }

  const plants = await plantsApi.list({ filter: `userId="${userId}"` });

  return { gardens, schemaObjects, lightZones, moistureZones, plants, plantings, journalEvents };
}

export interface RestoreResult {
  gardensRestored: number;
  plantsRestored: number;
  plantingsRestored: number;
  journalEventsRestored: number;
}

/**
 * Восстановить данные пользователя из бэкапа (задача 31.4) — полная замена:
 * все текущие участки пользователя удаляются каскадно перед вставкой новых.
 * Строит карты старый id → новый id для переписывания ссылочных полей,
 * как и Convex-версия (restoreFromBackup).
 */
export async function restoreFromBackup(data: {
  gardens: unknown[];
  schemaObjects: unknown[];
  lightZones: unknown[];
  moistureZones: unknown[];
  plants: unknown[];
  plantings: unknown[];
  journalEvents: unknown[];
}): Promise<RestoreResult> {
  const userId = pb.authStore.record?.id;
  if (!userId) throw new Error("Нужно войти в аккаунт");

  const existing = await gardensApi.list({ filter: `ownerId="${userId}"` });
  for (const g of existing) await removeGardenCascade(g.id);

  // 1. Участки
  const gardenIdMap = new Map<string, string>();
  for (const g of data.gardens as Record<string, unknown>[]) {
    const created = await gardensApi.create({
      ownerId: userId,
      name: g.name as string,
      description: (g.description as string) ?? undefined,
      boundary: (g.boundary as Garden["boundary"]) ?? undefined,
      originGps: (g.originGps as Garden["originGps"]) ?? undefined,
      canvasConfig: (g.canvasConfig as Garden["canvasConfig"]) ?? undefined,
    });
    gardenIdMap.set(g._id as string, created.id);
  }

  // 2. Объекты схемы + зоны условий обоих слоёв
  const schemaObjectIdMap = new Map<string, string>();
  for (const o of data.schemaObjects as Record<string, unknown>[]) {
    const gardenId = gardenIdMap.get(o.gardenId as string);
    if (!gardenId) continue;
    const created = await schemaObjectsApi.create({
      gardenId,
      type: o.type as SchemaObject["type"],
      label: (o.label as string) ?? undefined,
      geometry: o.geometry as SchemaObject["geometry"],
      style: (o.style as SchemaObject["style"]) ?? undefined,
      sortOrder: (o.sortOrder as number) ?? undefined,
    });
    schemaObjectIdMap.set(o._id as string, created.id);
  }

  for (const [api, docs] of [
    [lightZonesApi, data.lightZones],
    [moistureZonesApi, data.moistureZones],
  ] as const) {
    for (const z of docs as Record<string, unknown>[]) {
      const gardenId = gardenIdMap.get(z.gardenId as string);
      if (!gardenId) continue;
      await api.create({
        gardenId,
        name: (z.name as string) ?? undefined,
        geometry: z.geometry as { points: number[][] },
        condition: z.condition as never,
        style: (z.style as never) ?? undefined,
      });
    }
  }

  // 3. Растения справочника
  const plantIdMap = new Map<string, string>();
  for (const p of data.plants as Record<string, unknown>[]) {
    const created = await plantsApi.create({
      userId,
      plantType: p.plantType as string,
      name: p.name as string,
      variety: (p.variety as string) ?? undefined,
      description: (p.description as string) ?? undefined,
      catalogId: (p.catalogId as string) ?? undefined,
    });
    plantIdMap.set(p._id as string, created.id);
  }

  // 4. Посадки — сначала без relocatedToPlantingId, затем допатчиваем
  const plantingIdMap = new Map<string, string>();
  for (const pl of data.plantings as Record<string, unknown>[]) {
    const gardenId = gardenIdMap.get(pl.gardenId as string);
    const plantId = plantIdMap.get(pl.plantId as string);
    if (!gardenId || !plantId) continue;
    const created = await plantingsApi.create({
      gardenId,
      plantId,
      schemaObjectId: pl.schemaObjectId ? schemaObjectIdMap.get(pl.schemaObjectId as string) : undefined,
      positionNote: (pl.positionNote as string) ?? undefined,
      plantedAt: pl.plantedAt as string,
      status: pl.status as Planting["status"],
      endedAt: (pl.endedAt as string) ?? undefined,
      quantity: (pl.quantity as number) ?? undefined,
      notes: (pl.notes as string) ?? undefined,
    });
    plantingIdMap.set(pl._id as string, created.id);
  }

  for (const pl of data.plantings as Record<string, unknown>[]) {
    if (!pl.relocatedToPlantingId) continue;
    const fromId = plantingIdMap.get(pl._id as string);
    const toId = plantingIdMap.get(pl.relocatedToPlantingId as string);
    if (fromId && toId) await plantingsApi.update(fromId, { relocatedToPlantingId: toId });
  }

  // 5. События журнала
  let journalEventsRestored = 0;
  for (const e of data.journalEvents as Record<string, unknown>[]) {
    const plantingId = plantingIdMap.get(e.plantingId as string);
    if (!plantingId) continue;
    await journalEventsApi.create({
      plantingId,
      eventType: e.eventType as JournalEvent["eventType"],
      eventDate: e.eventDate as string,
      title: (e.title as string) ?? undefined,
      description: (e.description as string) ?? undefined,
      metadata: (e.metadata as JournalEvent["metadata"]) ?? undefined,
    });
    journalEventsRestored += 1;
  }

  return {
    gardensRestored: gardenIdMap.size,
    plantsRestored: plantIdMap.size,
    plantingsRestored: plantingIdMap.size,
    journalEventsRestored,
  };
}
