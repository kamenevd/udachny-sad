import { query, mutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getOrCreateUser, getUserId, requireGarden } from "./users";

/**
 * Журнал событий посадки (§2.8 ARCHITECTURE).
 * 12 типов: planting, watering, blooming, fruiting, harvest, pruning,
 * disease, pest, fertilizing, transplant, death, other.
 * Каждое событие допускает заметку и фото.
 */

const metadataValidator = v.object({
  weather: v.optional(
    v.object({
      temperature: v.optional(v.number()),
      condition: v.optional(v.string()),
    }),
  ),
  harvest: v.optional(
    v.object({
      quantity: v.optional(v.number()),
      unit: v.optional(v.string()),
    }),
  ),
  diagnosis: v.optional(v.string()),
  severity: v.optional(v.string()),
  notes: v.optional(v.string()),
});

/** Событие с проверкой владельца (через посадку → участок) */
async function requireEvent(
  ctx: QueryCtx,
  eventId: Id<"journalEvents">,
  userId: Id<"users">,
): Promise<Doc<"journalEvents">> {
  const event = await ctx.db.get(eventId);
  if (!event) throw new Error("Запись не найдена");

  const planting = await ctx.db.get(event.plantingId);
  if (!planting) throw new Error("Посадка не найдена");
  await requireGarden(ctx, planting.gardenId, userId);

  return event;
}

// ─── Queries ──────────────────────────────────────────────

// Лента событий посадки, свежие сверху (§4.3)
export const getByPlanting = query({
  args: { plantingId: v.id("plantings") },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    const planting = await ctx.db.get(args.plantingId);
    if (!planting) return [];
    const garden = await ctx.db.get(planting.gardenId);
    if (!garden || garden.ownerId !== userId) return [];

    const events = await ctx.db
      .query("journalEvents")
      .withIndex("by_planting", (q) => q.eq("plantingId", args.plantingId))
      .collect();

    // Сортировка по eventDate (не по _creationTime) —
    // события могут вноситься задним числом
    return events.sort((a, b) => b.eventDate - a.eventDate);
  },
});

// ─── Mutations ────────────────────────────────────────────

export const create = mutation({
  args: {
    plantingId: v.id("plantings"),
    eventType: v.string(),
    eventDate: v.number(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    metadata: v.optional(metadataValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getOrCreateUser(ctx);

    const planting = await ctx.db.get(args.plantingId);
    if (!planting) throw new Error("Посадка не найдена");
    await requireGarden(ctx, planting.gardenId, userId);

    const now = Date.now();
    return await ctx.db.insert("journalEvents", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    eventId: v.id("journalEvents"),
    eventType: v.optional(v.string()),
    eventDate: v.optional(v.number()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    metadata: v.optional(metadataValidator),
  },
  handler: async (ctx, args) => {
    const userId = await getOrCreateUser(ctx);
    await requireEvent(ctx, args.eventId, userId);

    const { eventId, ...fields } = args;
    const patch = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    );

    await ctx.db.patch(eventId, { ...patch, updatedAt: Date.now() });
    return null;
  },
});

/**
 * Удалить запись журнала.
 * Фото события удаляются физически — hard delete из File Storage (§3.4).
 */
export const remove = mutation({
  args: { eventId: v.id("journalEvents") },
  handler: async (ctx, args) => {
    const userId = await getOrCreateUser(ctx);
    await requireEvent(ctx, args.eventId, userId);

    const photos = await ctx.db
      .query("photos")
      .withIndex("by_owner", (q) =>
        q.eq("ownerType", "journalEvent").eq("ownerId", args.eventId),
      )
      .collect();
    for (const photo of photos) {
      await ctx.storage.delete(photo.storageId);
      await ctx.db.delete(photo._id);
    }

    await ctx.db.delete(args.eventId);
    return null;
  },
});
