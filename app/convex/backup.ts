import { query, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getOrCreateUser, getUserId } from "./users";
import { deletePhotosFor } from "./gardens";

/**
 * Полный экспорт данных пользователя в JSON для бэкапа (задача 31.3).
 * Отдаёт участки, объекты схемы, зоны, растения, посадки (все статусы)
 * и события журнала — всё, что нужно для восстановления через importJson.
 */
export const getFullExport = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) {
      return {
        gardens: [],
        schemaObjects: [],
        lightZones: [],
        moistureZones: [],
        plants: [],
        plantings: [],
        journalEvents: [],
      };
    }

    const gardens = await ctx.db
      .query("gardens")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    const schemaObjects = [];
    const lightZones = [];
    const moistureZones = [];
    const plantings = [];

    for (const garden of gardens) {
      schemaObjects.push(
        ...(await ctx.db
          .query("schemaObjects")
          .withIndex("by_garden", (q) => q.eq("gardenId", garden._id))
          .collect()),
      );
      lightZones.push(
        ...(await ctx.db
          .query("lightZones")
          .withIndex("by_garden", (q) => q.eq("gardenId", garden._id))
          .collect()),
      );
      moistureZones.push(
        ...(await ctx.db
          .query("moistureZones")
          .withIndex("by_garden", (q) => q.eq("gardenId", garden._id))
          .collect()),
      );
      plantings.push(
        ...(await ctx.db
          .query("plantings")
          .withIndex("by_garden", (q) => q.eq("gardenId", garden._id))
          .collect()),
      );
    }

    const journalEvents = [];
    for (const planting of plantings) {
      journalEvents.push(
        ...(await ctx.db
          .query("journalEvents")
          .withIndex("by_planting", (q) => q.eq("plantingId", planting._id))
          .collect()),
      );
    }

    const plants = await ctx.db
      .query("plants")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return {
      gardens,
      schemaObjects,
      lightZones,
      moistureZones,
      plants,
      plantings,
      journalEvents,
    };
  },
});

/** Удалить все текущие данные пользователя перед восстановлением из бэкапа */
async function wipeUserData(ctx: MutationCtx, userId: Id<"users">) {
  const gardens = await ctx.db
    .query("gardens")
    .withIndex("by_owner", (q) => q.eq("ownerId", userId))
    .collect();

  for (const garden of gardens) {
    const objects = await ctx.db
      .query("schemaObjects")
      .withIndex("by_garden", (q) => q.eq("gardenId", garden._id))
      .collect();
    for (const obj of objects) {
      await deletePhotosFor(ctx, "schemaObject", obj._id);
      await ctx.db.delete(obj._id);
    }

    for (const table of ["lightZones", "moistureZones"] as const) {
      const zones = await ctx.db
        .query(table)
        .withIndex("by_garden", (q) => q.eq("gardenId", garden._id))
        .collect();
      for (const zone of zones) await ctx.db.delete(zone._id);
    }

    const plantings = await ctx.db
      .query("plantings")
      .withIndex("by_garden", (q) => q.eq("gardenId", garden._id))
      .collect();
    for (const planting of plantings) {
      const events = await ctx.db
        .query("journalEvents")
        .withIndex("by_planting", (q) => q.eq("plantingId", planting._id))
        .collect();
      for (const event of events) {
        await deletePhotosFor(ctx, "journalEvent", event._id);
        await ctx.db.delete(event._id);
      }
      await deletePhotosFor(ctx, "planting", planting._id);
      await ctx.db.delete(planting._id);
    }

    await ctx.db.delete(garden._id);
  }

  const plants = await ctx.db
    .query("plants")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const plant of plants) await ctx.db.delete(plant._id);
}

/**
 * Восстановить данные пользователя из бэкапа (задача 31.4).
 *
 * Это полная замена, а не слияние: перед вставкой все текущие данные
 * пользователя удаляются (wipeUserData) — сценарий использования: потеря
 * данных на устройстве, восстановление на новом. Ограничение «один участок
 * на пользователя» (gardens.create) при восстановлении не применяется —
 * Gardens.tsx и так рендерит список участков, поэтому бэкап с несколькими
 * участками восстанавливается полностью.
 *
 * Т.к. `_id` документов в бэкапе — это старые идентификаторы (после вставки
 * появятся новые), восстановление строит карты старый _id → новый Id для
 * каждой таблицы и переписывает ссылочные поля по ним. Convex-мутация
 * атомарна — если вставка одного документа нарушит схему, вся операция
 * откатится.
 */
export const restoreFromBackup = mutation({
  args: {
    gardens: v.array(v.any()),
    schemaObjects: v.array(v.any()),
    lightZones: v.array(v.any()),
    moistureZones: v.array(v.any()),
    plants: v.array(v.any()),
    plantings: v.array(v.any()),
    journalEvents: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    const userId = await getOrCreateUser(ctx);

    await wipeUserData(ctx, userId);

    const now = Date.now();

    // 1. Участки
    const gardenIdMap = new Map<string, Id<"gardens">>();
    for (const g of args.gardens) {
      const newId = await ctx.db.insert("gardens", {
        ownerId: userId,
        name: g.name,
        description: g.description ?? undefined,
        boundary: g.boundary ?? undefined,
        originGps: g.originGps ?? undefined,
        canvasConfig: g.canvasConfig ?? undefined,
        createdAt: g.createdAt ?? now,
        updatedAt: g.updatedAt ?? now,
      });
      gardenIdMap.set(g._id, newId);
    }

    // 2. Объекты схемы + зоны условий обоих слоёв
    const schemaObjectIdMap = new Map<string, Id<"schemaObjects">>();
    for (const o of args.schemaObjects) {
      const gardenId = gardenIdMap.get(o.gardenId);
      if (!gardenId) continue;
      const newId = await ctx.db.insert("schemaObjects", {
        gardenId,
        type: o.type,
        label: o.label ?? undefined,
        geometry: o.geometry,
        style: o.style ?? undefined,
        sortOrder: o.sortOrder ?? undefined,
        createdAt: o.createdAt ?? now,
        updatedAt: o.updatedAt ?? now,
      });
      schemaObjectIdMap.set(o._id, newId);
    }

    for (const [table, docs] of [
      ["lightZones", args.lightZones],
      ["moistureZones", args.moistureZones],
    ] as const) {
      for (const z of docs) {
        const gardenId = gardenIdMap.get(z.gardenId);
        if (!gardenId) continue;
        await ctx.db.insert(table, {
          gardenId,
          name: z.name ?? undefined,
          geometry: z.geometry,
          condition: z.condition,
          style: z.style ?? undefined,
          createdAt: z.createdAt ?? now,
          updatedAt: z.updatedAt ?? now,
        });
      }
    }

    // 3. Растения справочника
    const plantIdMap = new Map<string, Id<"plants">>();
    for (const p of args.plants) {
      const newId = await ctx.db.insert("plants", {
        userId,
        plantType: p.plantType,
        name: p.name,
        variety: p.variety ?? undefined,
        description: p.description ?? undefined,
        catalogId: p.catalogId ?? undefined,
        createdAt: p.createdAt ?? now,
        updatedAt: p.updatedAt ?? now,
      });
      plantIdMap.set(p._id, newId);
    }

    // 4. Посадки — сначала без relocatedToPlantingId (может ссылаться
    // на посадку, вставленную позже), затем допатчиваем ссылку
    const plantingIdMap = new Map<string, Id<"plantings">>();
    for (const pl of args.plantings) {
      const gardenId = gardenIdMap.get(pl.gardenId);
      const plantId = plantIdMap.get(pl.plantId);
      if (!gardenId || !plantId) continue;
      const newId = await ctx.db.insert("plantings", {
        gardenId,
        plantId,
        schemaObjectId: pl.schemaObjectId
          ? schemaObjectIdMap.get(pl.schemaObjectId)
          : undefined,
        positionNote: pl.positionNote ?? undefined,
        plantedAt: pl.plantedAt,
        status: pl.status,
        endedAt: pl.endedAt ?? undefined,
        quantity: pl.quantity ?? undefined,
        notes: pl.notes ?? undefined,
        createdAt: pl.createdAt ?? now,
        updatedAt: pl.updatedAt ?? now,
      });
      plantingIdMap.set(pl._id, newId);
    }

    for (const pl of args.plantings) {
      if (!pl.relocatedToPlantingId) continue;
      const fromId = plantingIdMap.get(pl._id);
      const toId = plantingIdMap.get(pl.relocatedToPlantingId);
      if (fromId && toId) {
        await ctx.db.patch(fromId, { relocatedToPlantingId: toId });
      }
    }

    // 5. События журнала
    let journalEventsRestored = 0;
    for (const e of args.journalEvents) {
      const plantingId = plantingIdMap.get(e.plantingId);
      if (!plantingId) continue;
      await ctx.db.insert("journalEvents", {
        plantingId,
        eventType: e.eventType,
        eventDate: e.eventDate,
        title: e.title ?? undefined,
        description: e.description ?? undefined,
        metadata: e.metadata ?? undefined,
        createdAt: e.createdAt ?? now,
        updatedAt: e.updatedAt ?? now,
      });
      journalEventsRestored += 1;
    }

    return {
      gardensRestored: gardenIdMap.size,
      plantsRestored: plantIdMap.size,
      plantingsRestored: plantingIdMap.size,
      journalEventsRestored,
    };
  },
});
