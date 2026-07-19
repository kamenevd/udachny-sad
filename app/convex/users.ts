import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

// ─── Queries ──────────────────────────────────────────────

/** Текущий пользователь (null, если не авторизован) */
export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

// ─── Helpers (для других convex-модулей) ──────────────────

/**
 * Id авторизованного пользователя или ошибка.
 * Для queries, где писать в БД нельзя.
 */
export async function requireUserId(ctx: QueryCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Необходима авторизация");
  return userId;
}

/**
 * Id авторизованного пользователя или null (для «мягких» queries,
 * которые при отсутствии авторизации возвращают пустой результат).
 */
export async function getUserId(ctx: QueryCtx): Promise<Id<"users"> | null> {
  return await getAuthUserId(ctx);
}

/**
 * Upsert бизнес-записи пользователя.
 * Документ в `users` создаёт сам Convex Auth при регистрации — здесь
 * доводим его бизнес-полями (role, locale, createdAt/updatedAt, имя).
 * Возвращает Id пользователя.
 */
export async function getOrCreateUser(ctx: MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Необходима авторизация");

  const user = await ctx.db.get(userId);
  if (!user) throw new Error("Пользователь не найден");

  if (user.createdAt === undefined) {
    const now = Date.now();
    await ctx.db.patch(userId, {
      name: user.name ?? user.email ?? "Садовод",
      role: user.role ?? "owner",
      locale: user.locale ?? "ru",
      createdAt: now,
      updatedAt: now,
    });
  }

  return userId;
}

/**
 * Проверка, что участок существует и принадлежит пользователю.
 * Возвращает документ участка или бросает ошибку.
 */
export async function requireGarden(
  ctx: QueryCtx,
  gardenId: Id<"gardens">,
  userId: Id<"users">,
): Promise<Doc<"gardens">> {
  const garden = await ctx.db.get(gardenId);
  if (!garden || garden.ownerId !== userId) {
    throw new Error("Участок не найден");
  }
  return garden;
}
