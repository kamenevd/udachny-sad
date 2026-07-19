import { query, mutation } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { getOrCreateUser, getUserId, requireGarden } from "./users";

// ─── Queries ──────────────────────────────────────────────

// Список участков пользователя
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("gardens")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .order("desc")
      .collect();
  },
});

// Получить участок по ID (с проверкой владельца)
export const getById = query({
  args: { gardenId: v.id("gardens") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const garden = await ctx.db.get(args.gardenId);
    if (!garden || garden.ownerId !== userId) return null;

    return garden;
  },
});

// ─── Mutations ──────────────────────────────────────────────

/**
 * Создать участок.
 * MVP: один участок на пользователя — если уже есть, выбрасывает ошибку.
 *
 * Если переданы width/length — генерируется прямоугольный boundary.
 * Если нет — boundary останется пустым (свободное рисование через Konva).
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    width: v.optional(v.number()),
    length: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getOrCreateUser(ctx);

    // MVP-ограничение: один участок на пользователя
    const existing = await ctx.db
      .query("gardens")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .first();

    if (existing) {
      throw new Error("У вас уже есть участок. В MVP доступен только один.");
    }

    const now = Date.now();

    // Генерируем прямоугольный boundary, если width/length переданы
    const boundary =
      args.width && args.length
        ? {
            points: [
              [0, 0],
              [args.width, 0],
              [args.width, args.length],
              [0, args.length],
            ],
          }
        : undefined;

    const gardenId = await ctx.db.insert("gardens", {
      ownerId: userId,
      name: args.name,
      description: args.description,
      boundary,
      createdAt: now,
      updatedAt: now,
    });

    return gardenId;
  },
});

/** Удалить все фото сущности (запись + файл из File Storage, §3.4 ARCHITECTURE) */
export async function deletePhotosFor(
  ctx: MutationCtx,
  ownerType: string,
  ownerId: string,
) {
  const photos = await ctx.db
    .query("photos")
    .withIndex("by_owner", (q) =>
      q.eq("ownerType", ownerType).eq("ownerId", ownerId),
    )
    .collect();

  for (const photo of photos) {
    await ctx.storage.delete(photo.storageId);
    await ctx.db.delete(photo._id);
  }
}

/**
 * Удалить участок.
 * Каскад (§3.4 ARCHITECTURE): объекты схемы, зоны обоих слоёв, посадки,
 * события журнала и все фото (включая файлы в File Storage).
 */
export const remove = mutation({
  args: { gardenId: v.id("gardens") },
  handler: async (ctx, args) => {
    const userId = await getOrCreateUser(ctx);
    await requireGarden(ctx, args.gardenId, userId);

    // 1. Объекты схемы + их фото
    const objects = await ctx.db
      .query("schemaObjects")
      .withIndex("by_garden", (q) => q.eq("gardenId", args.gardenId))
      .collect();
    for (const obj of objects) {
      await deletePhotosFor(ctx, "schemaObject", obj._id);
      await ctx.db.delete(obj._id);
    }

    // 2. Зоны условий (оба слоя)
    for (const table of ["lightZones", "moistureZones"] as const) {
      const zones = await ctx.db
        .query(table)
        .withIndex("by_garden", (q) => q.eq("gardenId", args.gardenId))
        .collect();
      for (const zone of zones) {
        await ctx.db.delete(zone._id);
      }
    }

    // 3. Посадки + их события журнала + фото
    const plantings = await ctx.db
      .query("plantings")
      .withIndex("by_garden", (q) => q.eq("gardenId", args.gardenId))
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

    // 4. Сам участок
    await ctx.db.delete(args.gardenId);
    return null;
  },
});
