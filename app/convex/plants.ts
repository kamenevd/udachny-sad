import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getOrCreateUser, getUserId } from "./users";

/**
 * Персональный справочник растений (§2.6 ARCHITECTURE).
 * plantType: "tree" | "shrub" | "perennial" | "annual".
 */

// ─── Queries ──────────────────────────────────────────────

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("plants")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

// ─── Mutations ────────────────────────────────────────────

export const create = mutation({
  args: {
    plantType: v.string(),
    name: v.string(),
    variety: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getOrCreateUser(ctx);

    const now = Date.now();
    return await ctx.db.insert("plants", {
      userId,
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    plantId: v.id("plants"),
    plantType: v.optional(v.string()),
    name: v.optional(v.string()),
    variety: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getOrCreateUser(ctx);

    const plant = await ctx.db.get(args.plantId);
    if (!plant || plant.userId !== userId) {
      throw new Error("Растение не найдено");
    }

    const { plantId, ...fields } = args;
    const patch = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    );

    await ctx.db.patch(plantId, { ...patch, updatedAt: Date.now() });
    return null;
  },
});

/**
 * Удалить растение из справочника.
 * Запрещено, если по растению есть посадки (история неизменна).
 */
export const remove = mutation({
  args: { plantId: v.id("plants") },
  handler: async (ctx, args) => {
    const userId = await getOrCreateUser(ctx);

    const plant = await ctx.db.get(args.plantId);
    if (!plant || plant.userId !== userId) {
      throw new Error("Растение не найдено");
    }

    const planting = await ctx.db
      .query("plantings")
      .withIndex("by_plant", (q) => q.eq("plantId", args.plantId))
      .first();

    if (planting) {
      throw new Error(
        "По этому растению есть записи о посадках — удалить его из справочника нельзя.",
      );
    }

    await ctx.db.delete(args.plantId);
    return null;
  },
});
