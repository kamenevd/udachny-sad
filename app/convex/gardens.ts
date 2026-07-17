import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Queries ──────────────────────────────────────────────

// Список участков пользователя
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    // Находим user record по email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) return [];

    return await ctx.db
      .query("gardens")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .order("desc")
      .collect();
  },
});

// Получить участок по ID (с проверкой владельца)
export const getById = query({
  args: { gardenId: v.id("gardens") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const garden = await ctx.db.get(args.gardenId);
    if (!garden) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user || garden.ownerId !== user._id) return null;

    return garden;
  },
});

// ─── Mutations ──────────────────────────────────────────────

/**
 * Создать участок.
 * Проверяет владельца через ctx.auth.getUserIdentity().
 * MVP: один участок на пользователя — если уже есть, выбрасывает ошибку.
 *
 * Если переданы width/length — генерируется прямоугольный boundary.
 * Если нет — boundary останется пустым (свободное рисование через Konva).
 *
 * User record создаётся автоматически (upsert), если не найден.
 */
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    width: v.optional(v.number()),
    length: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Необходима авторизация");
    }

    // Находим или создаём user record (upsert)
    let user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user) {
      const now = Date.now();
      const userId = await ctx.db.insert("users", {
        name: identity.name ?? "Пользователь",
        email: identity.email!,
        role: "owner",
        locale: "ru",
        createdAt: now,
        updatedAt: now,
      });
      user = await ctx.db.get(userId);
    }

    // MVP-ограничение: один участок на пользователя
    const existing = await ctx.db
      .query("gardens")
      .withIndex("by_owner", (q) => q.eq("ownerId", user!._id))
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
      ownerId: user!._id,
      name: args.name,
      description: args.description,
      boundary,
      createdAt: now,
      updatedAt: now,
    });

    return gardenId;
  },
});

/**
 * Удалить участок.
 * Проверяет владельца: garden.ownerId должен совпадать с текущим пользователем.
 * Каскадное удаление всех дочерних объектов (MVP: только участок).
 */
export const remove = mutation({
  args: { gardenId: v.id("gardens") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Необходима авторизация");
    }

    const garden = await ctx.db.get(args.gardenId);
    if (!garden) {
      throw new Error("Участок не найден");
    }

    // Проверка владельца
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email!))
      .first();

    if (!user || garden.ownerId !== user._id) {
      throw new Error("Нет прав на удаление этого участка");
    }

    // TODO: каскадное удаление schemaObjects, zones, plantings, journalEvents, photos
    await ctx.db.delete(args.gardenId);
    return null;
  },
});