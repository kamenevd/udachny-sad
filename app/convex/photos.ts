import { query, mutation } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getOrCreateUser, getUserId, requireGarden } from "./users";

/**
 * Фото — полиморфная сущность (§2.9 ARCHITECTURE).
 * ownerType: "planting" | "journalEvent" | "schemaObject".
 * Файлы — в Convex File Storage; удаление всегда hard delete (§3.4, §4.8).
 */

const ownerTypeValidator = v.union(
  v.literal("planting"),
  v.literal("journalEvent"),
  v.literal("schemaObject"),
);

/**
 * Проверяет, что сущность-владелец фото существует и принадлежит
 * пользователю (через цепочку до участка). Бросает ошибку, если нет.
 */
async function requireOwnerEntity(
  ctx: QueryCtx,
  ownerType: "planting" | "journalEvent" | "schemaObject",
  ownerId: string,
  userId: Id<"users">,
): Promise<void> {
  let gardenId: Id<"gardens"> | null = null;

  if (ownerType === "planting") {
    const id = ctx.db.normalizeId("plantings", ownerId);
    const planting = id ? await ctx.db.get(id) : null;
    gardenId = planting?.gardenId ?? null;
  } else if (ownerType === "journalEvent") {
    const id = ctx.db.normalizeId("journalEvents", ownerId);
    const event = id ? await ctx.db.get(id) : null;
    const planting = event ? await ctx.db.get(event.plantingId) : null;
    gardenId = planting?.gardenId ?? null;
  } else {
    const id = ctx.db.normalizeId("schemaObjects", ownerId);
    const object = id ? await ctx.db.get(id) : null;
    gardenId = object?.gardenId ?? null;
  }

  if (!gardenId) throw new Error("Запись для фото не найдена");
  await requireGarden(ctx, gardenId, userId);
}

// ─── Queries ──────────────────────────────────────────────

// Фото сущности с готовыми URL для отображения
export const listByOwner = query({
  args: {
    ownerType: ownerTypeValidator,
    ownerId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return [];

    try {
      await requireOwnerEntity(ctx, args.ownerType, args.ownerId, userId);
    } catch {
      return [];
    }

    const photos = await ctx.db
      .query("photos")
      .withIndex("by_owner", (q) =>
        q.eq("ownerType", args.ownerType).eq("ownerId", args.ownerId),
      )
      .collect();

    return await Promise.all(
      photos.map(async (photo) => ({
        ...photo,
        url: await ctx.storage.getUrl(photo.storageId),
      })),
    );
  },
});

// ─── Mutations ────────────────────────────────────────────

// Шаг 1 из 3: URL для POST-загрузки файла (§4.7)
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getOrCreateUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// Шаг 3 из 3: сохранить запись о загруженном файле
export const save = mutation({
  args: {
    storageId: v.id("_storage"),
    ownerType: ownerTypeValidator,
    ownerId: v.string(),
    caption: v.optional(v.string()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    fileSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getOrCreateUser(ctx);
    await requireOwnerEntity(ctx, args.ownerType, args.ownerId, userId);

    return await ctx.db.insert("photos", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

// Удалить фото — hard delete файла и записи (§4.8)
export const remove = mutation({
  args: { photoId: v.id("photos") },
  handler: async (ctx, args) => {
    const userId = await getOrCreateUser(ctx);

    const photo = await ctx.db.get(args.photoId);
    if (!photo) throw new Error("Фото не найдено");

    await requireOwnerEntity(
      ctx,
      photo.ownerType as "planting" | "journalEvent" | "schemaObject",
      photo.ownerId,
      userId,
    );

    // 1. Hard delete файла из Convex File Storage
    await ctx.storage.delete(photo.storageId);
    // 2. Удалить запись из таблицы photos
    await ctx.db.delete(args.photoId);
    return null;
  },
});
