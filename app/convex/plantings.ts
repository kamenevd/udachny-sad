import { query, mutation } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getOrCreateUser, getUserId, requireGarden } from "./users";

/**
 * Посадки — ключевая сущность (§2.7 ARCHITECTURE).
 * История неизменна: посадка не удаляется, а закрывается
 * (status: "relocated" | "dead" | "completed").
 */

/** Посадка с проверкой владельца (через участок) */
async function requirePlanting(
  ctx: QueryCtx,
  plantingId: Id<"plantings">,
  userId: Id<"users">,
): Promise<Doc<"plantings">> {
  const planting = await ctx.db.get(plantingId);
  if (!planting) throw new Error("Посадка не найдена");
  await requireGarden(ctx, planting.gardenId, userId);
  return planting;
}

/** Посадка + карточка растения (для списков и экранов) */
async function withPlant(ctx: QueryCtx, planting: Doc<"plantings">) {
  const plant = await ctx.db.get(planting.plantId);
  return { ...planting, plant };
}

// ─── Queries ──────────────────────────────────────────────

// Активные посадки на участке (§4.2) — с карточками растений
export const getActive = query({
  args: { gardenId: v.id("gardens") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const garden = await ctx.db.get(args.gardenId);
    if (!garden || garden.ownerId !== userId) return [];

    const plantings = await ctx.db
      .query("plantings")
      .withIndex("by_garden_and_status", (q) =>
        q.eq("gardenId", args.gardenId).eq("status", "active"),
      )
      .collect();

    return await Promise.all(plantings.map((p) => withPlant(ctx, p)));
  },
});

// История посадок на объекте схемы — «Что росло на этом месте?» (§4.1)
export const getHistory = query({
  args: { schemaObjectId: v.id("schemaObjects") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const object = await ctx.db.get(args.schemaObjectId);
    if (!object) return [];
    const garden = await ctx.db.get(object.gardenId);
    if (!garden || garden.ownerId !== userId) return [];

    const plantings = await ctx.db
      .query("plantings")
      .withIndex("by_schema_object", (q) =>
        q.eq("schemaObjectId", args.schemaObjectId),
      )
      .collect();

    // Сортировка по plantedAt (не по _creationTime) —
    // пользователи вносят исторические данные задним числом
    plantings.sort((a, b) => b.plantedAt - a.plantedAt);

    return await Promise.all(plantings.map((p) => withPlant(ctx, p)));
  },
});

// Посадка по Id — с карточкой растения
export const getById = query({
  args: { plantingId: v.id("plantings") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const planting = await ctx.db.get(args.plantingId);
    if (!planting) return null;

    const garden = await ctx.db.get(planting.gardenId);
    if (!garden || garden.ownerId !== userId) return null;

    const schemaObject = planting.schemaObjectId
      ? await ctx.db.get(planting.schemaObjectId)
      : null;

    return { ...(await withPlant(ctx, planting)), schemaObject };
  },
});

// Цепочка пересадок: от указанной посадки к самой новой (§4.6)
export const getTransplantChain = query({
  args: { plantingId: v.id("plantings") },
  handler: async (ctx, args) => {
    const chain: Doc<"plantings">[] = [];
    const userId = await getUserId(ctx);
    if (!userId) return chain;

    let current = await ctx.db.get(args.plantingId);
    if (!current) return chain;

    const garden = await ctx.db.get(current.gardenId);
    if (!garden || garden.ownerId !== userId) return chain;

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

// ─── Mutations ────────────────────────────────────────────

/** Авто-событие журнала при изменении статуса посадки */
async function insertAutoEvent(
  ctx: MutationCtx,
  plantingId: Id<"plantings">,
  eventType: string,
  eventDate: number,
  title: string,
  description?: string,
) {
  const now = Date.now();
  await ctx.db.insert("journalEvents", {
    plantingId,
    eventType,
    eventDate,
    title,
    description,
    createdAt: now,
    updatedAt: now,
  });
}

// Создать посадку + авто-событие "planting" (§4.4)
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
    const userId = await getOrCreateUser(ctx);
    const garden = await requireGarden(ctx, args.gardenId, userId);

    const plant = await ctx.db.get(args.plantId);
    if (!plant || plant.userId !== userId) {
      throw new Error("Растение не найдено в вашем справочнике");
    }

    if (args.schemaObjectId) {
      const object = await ctx.db.get(args.schemaObjectId);
      if (!object || object.gardenId !== garden._id) {
        throw new Error("Объект схемы не найден на этом участке");
      }
    }

    const now = Date.now();
    const plantingId = await ctx.db.insert("plantings", {
      ...args,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await insertAutoEvent(ctx, plantingId, "planting", args.plantedAt, "Посадка");

    return plantingId;
  },
});

/**
 * Закрыть посадку: "dead" (погибло, авто-событие "death") или
 * "completed" (завершено, авто-событие "other").
 */
export const close = mutation({
  args: {
    plantingId: v.id("plantings"),
    status: v.union(v.literal("dead"), v.literal("completed")),
    endedAt: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getOrCreateUser(ctx);
    const planting = await requirePlanting(ctx, args.plantingId, userId);

    if (planting.status !== "active") {
      throw new Error("Эта посадка уже закрыта");
    }

    await ctx.db.patch(args.plantingId, {
      status: args.status,
      endedAt: args.endedAt,
      updatedAt: Date.now(),
    });

    if (args.status === "dead") {
      await insertAutoEvent(
        ctx,
        args.plantingId,
        "death",
        args.endedAt,
        "Гибель",
        args.description,
      );
    } else {
      await insertAutoEvent(
        ctx,
        args.plantingId,
        "other",
        args.endedAt,
        "Посадка завершена",
        args.description,
      );
    }

    return null;
  },
});

// Пересадка: закрыть старую, создать новую, связать, авто-событие (§4.5)
export const transplant = mutation({
  args: {
    plantingId: v.id("plantings"),
    newSchemaObjectId: v.optional(v.id("schemaObjects")),
    newPositionNote: v.optional(v.string()),
    transplantDate: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getOrCreateUser(ctx);
    const oldPlanting = await requirePlanting(ctx, args.plantingId, userId);

    if (oldPlanting.status !== "active") {
      throw new Error("Пересадить можно только активную посадку");
    }

    if (args.newSchemaObjectId) {
      const object = await ctx.db.get(args.newSchemaObjectId);
      if (!object || object.gardenId !== oldPlanting.gardenId) {
        throw new Error("Объект схемы не найден на этом участке");
      }
    }

    const now = Date.now();

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
      quantity: oldPlanting.quantity,
      createdAt: now,
      updatedAt: now,
    });

    // 3. Связать: старая → новая (Q1)
    await ctx.db.patch(args.plantingId, {
      relocatedToPlantingId: newPlantingId,
    });

    // 4. Авто-событие "transplant" у старой посадки
    await insertAutoEvent(
      ctx,
      args.plantingId,
      "transplant",
      args.transplantDate,
      "Пересадка",
      "Пересажено на новое место",
    );

    return newPlantingId;
  },
});
