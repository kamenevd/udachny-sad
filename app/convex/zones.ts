import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getOrCreateUser, getUserId, requireGarden } from "./users";

/**
 * Зоны условий: lightZones (свет) и moistureZones (влага) — два независимых
 * слоя (§2.4–2.5 ARCHITECTURE). Один набор функций на оба слоя, слой
 * выбирается аргументом layer.
 */

const layerValidator = v.union(v.literal("light"), v.literal("moisture"));

const geometryValidator = v.object({
  points: v.array(v.array(v.number())), // [[x, y], ...] — метры
});

const styleValidator = v.object({
  color: v.optional(v.string()),
  opacity: v.optional(v.number()),
});

function tableFor(layer: "light" | "moisture") {
  return layer === "light" ? ("lightZones" as const) : ("moistureZones" as const);
}

// ─── Queries ──────────────────────────────────────────────

// Оба слоя разом (§4.9 ARCHITECTURE)
export const getByGarden = query({
  args: { gardenId: v.id("gardens") },
  handler: async (ctx, args) => {
    const empty = { lightZones: [], moistureZones: [] };
    const userId = await getUserId(ctx);
    if (!userId) return empty;

    const garden = await ctx.db.get(args.gardenId);
    if (!garden || garden.ownerId !== userId) return empty;

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

// ─── Mutations ────────────────────────────────────────────

export const create = mutation({
  args: {
    gardenId: v.id("gardens"),
    layer: layerValidator,
    // light: "sunny" | "partial_shade" | "shade"; moisture: "dry" | "moderate" | "wet"
    condition: v.string(),
    geometry: geometryValidator,
    name: v.optional(v.string()),
    style: v.optional(styleValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getOrCreateUser(ctx);
    await requireGarden(ctx, args.gardenId, userId);

    const { layer, ...fields } = args;
    const now = Date.now();
    return await ctx.db.insert(tableFor(layer), {
      ...fields,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    layer: layerValidator,
    zoneId: v.string(), // Id зоны в таблице слоя
    condition: v.optional(v.string()),
    geometry: v.optional(geometryValidator),
    name: v.optional(v.string()),
    style: v.optional(styleValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getOrCreateUser(ctx);

    const table = tableFor(args.layer);
    const zoneId = ctx.db.normalizeId(table, args.zoneId);
    if (!zoneId) throw new Error("Зона не найдена");

    const zone = await ctx.db.get(zoneId);
    if (!zone) throw new Error("Зона не найдена");
    await requireGarden(ctx, zone.gardenId, userId);

    const { layer, zoneId: _raw, ...fields } = args;
    const patch = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    );

    await ctx.db.patch(zoneId, { ...patch, updatedAt: Date.now() });
    return null;
  },
});

export const remove = mutation({
  args: {
    layer: layerValidator,
    zoneId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getOrCreateUser(ctx);

    const table = tableFor(args.layer);
    const zoneId = ctx.db.normalizeId(table, args.zoneId);
    if (!zoneId) throw new Error("Зона не найдена");

    const zone = await ctx.db.get(zoneId);
    if (!zone) throw new Error("Зона не найдена");
    await requireGarden(ctx, zone.gardenId, userId);

    await ctx.db.delete(zoneId);
    return null;
  },
});
