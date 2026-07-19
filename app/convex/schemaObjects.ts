import { query, mutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getOrCreateUser, getUserId, requireGarden } from "./users";

// ─── Валидаторы ───────────────────────────────────────────

const geometryValidator = v.object({
  type: v.string(), // "point" | "line" | "polygon"
  points: v.array(v.array(v.number())), // [[x, y], ...] — метры
});

const styleValidator = v.object({
  color: v.optional(v.string()),
  fillColor: v.optional(v.string()),
  strokeWidth: v.optional(v.number()),
  icon: v.optional(v.string()),
});

/** Разумный предел координаты в метрах — участок реального размера сюда влезает (задача 18.1) */
const MAX_COORD_M = 10_000;

/** Точки геометрии — конечные числа в разумных пределах листа (задача 18.1) */
function validateGeometry(geometry: { type: string; points: number[][] }): void {
  if (geometry.points.length === 0) {
    throw new Error("Геометрия должна содержать хотя бы одну точку");
  }
  for (const point of geometry.points) {
    if (point.length !== 2) {
      throw new Error("Каждая точка геометрии — пара координат [x, y]");
    }
    for (const coord of point) {
      if (!Number.isFinite(coord)) {
        throw new Error("Координаты объекта должны быть конечными числами");
      }
      if (Math.abs(coord) > MAX_COORD_M) {
        throw new Error(`Координата объекта вне допустимых пределов (±${MAX_COORD_M} м)`);
      }
    }
  }
}

/** Объект схемы с проверкой, что его участок принадлежит пользователю */
async function requireObject(
  ctx: QueryCtx,
  objectId: Id<"schemaObjects">,
  userId: Id<"users">,
): Promise<Doc<"schemaObjects">> {
  const object = await ctx.db.get(objectId);
  if (!object) throw new Error("Объект не найден");
  await requireGarden(ctx, object.gardenId, userId);
  return object;
}

// ─── Queries ──────────────────────────────────────────────

// Все объекты участка
export const listByGarden = query({
  args: { gardenId: v.id("gardens") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const garden = await ctx.db.get(args.gardenId);
    if (!garden || garden.ownerId !== userId) return [];

    return await ctx.db
      .query("schemaObjects")
      .withIndex("by_garden", (q) => q.eq("gardenId", args.gardenId))
      .collect();
  },
});

// ─── Mutations ────────────────────────────────────────────

export const create = mutation({
  args: {
    gardenId: v.id("gardens"),
    type: v.string(),
    label: v.optional(v.string()),
    geometry: geometryValidator,
    style: v.optional(styleValidator),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getOrCreateUser(ctx);
    await requireGarden(ctx, args.gardenId, userId);
    validateGeometry(args.geometry);

    const now = Date.now();
    return await ctx.db.insert("schemaObjects", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    objectId: v.id("schemaObjects"),
    label: v.optional(v.string()),
    geometry: v.optional(geometryValidator),
    style: v.optional(styleValidator),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getOrCreateUser(ctx);
    await requireObject(ctx, args.objectId, userId);
    if (args.geometry) validateGeometry(args.geometry);

    const { objectId, ...fields } = args;
    const patch = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    );

    await ctx.db.patch(objectId, { ...patch, updatedAt: Date.now() });
    return null;
  },
});

/**
 * Списать объект со схемы.
 * Инвариант §3.4 ARCHITECTURE: если у объекта есть посадки (активные или
 * исторические) — удалить нельзя, только переименовать/скрыть.
 */
export const remove = mutation({
  args: { objectId: v.id("schemaObjects") },
  handler: async (ctx, args) => {
    const userId = await getOrCreateUser(ctx);
    await requireObject(ctx, args.objectId, userId);

    const planting = await ctx.db
      .query("plantings")
      .withIndex("by_schema_object", (q) =>
        q.eq("schemaObjectId", args.objectId),
      )
      .first();

    if (planting) {
      throw new Error(
        "На этом месте есть записи о посадках — списать его со схемы нельзя. История должна сохраниться.",
      );
    }

    // Фото объекта — hard delete (файл + запись)
    const photos = await ctx.db
      .query("photos")
      .withIndex("by_owner", (q) =>
        q.eq("ownerType", "schemaObject").eq("ownerId", args.objectId),
      )
      .collect();
    for (const photo of photos) {
      await ctx.storage.delete(photo.storageId);
      await ctx.db.delete(photo._id);
    }

    await ctx.db.delete(args.objectId);
    return null;
  },
});
