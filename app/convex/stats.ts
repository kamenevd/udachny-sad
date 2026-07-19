import { query } from "./_generated/server";
import { v } from "convex/values";
import { getUserId } from "./users";

/**
 * Статистика пользователя — для вымпела «УДАРНИК УЧЁТА» (DESIGN.md v5.1 §6).
 */

/**
 * Серия дней с записями в журнале, считая от сегодня назад.
 * Если сегодня записей нет — стрик обрывается (0).
 * Возвращает { days: number, hasToday: boolean }.
 */
export const getStreak = query({
  args: { gardenId: v.optional(v.id("gardens")) },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return { days: 0, hasToday: false };

    // Собираем все участки пользователя (или один указанный)
    const gardens = args.gardenId
      ? [await ctx.db.get(args.gardenId)]
      : await ctx.db
          .query("gardens")
          .withIndex("by_owner", (q) => q.eq("ownerId", userId))
          .collect();

    const gardenIds = gardens
      .filter((g) => g !== null)
      .map((g) => g!._id);
    if (gardenIds.length === 0) return { days: 0, hasToday: false };

    // Все посадки на этих участках
    const plantingIdSet = new Set<string>();
    for (const gid of gardenIds) {
      const plantings = await ctx.db
        .query("plantings")
        .withIndex("by_garden", (q) => q.eq("gardenId", gid))
        .collect();
      for (const p of plantings) plantingIdSet.add(p._id);
    }
    if (plantingIdSet.size === 0) return { days: 0, hasToday: false };

    // Все события журнала пользователя — собираем даты (по дням)
    const daySet = new Set<string>(); // YYYY-MM-DD
    for (const plantingId of plantingIdSet) {
      const events = await ctx.db
        .query("journalEvents")
        .withIndex("by_planting", (q) =>
          q.eq("plantingId", plantingId as any),
        )
        .collect();
      for (const ev of events) {
        const d = new Date(ev.eventDate);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        daySet.add(key);
      }
    }
    if (daySet.size === 0) return { days: 0, hasToday: false };

    // Считаем серию назад от сегодня
    const now = new Date();
    let days = 0;
    // Если сегодня нет записей — стрик может идти со вчера (льготный режим)
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const hasToday = daySet.has(todayKey);

    // Начинаем с сегодня (если есть) или вчера
    const start = new Date(now);
    if (!hasToday) start.setDate(start.getDate() - 1);

    for (let i = 0; i < 366; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (daySet.has(key)) days++;
      else break;
    }

    return { days, hasToday };
  },
});

/**
 * Годовой отчёт по участку (задача 33.1): сколько посадок начато/погибло,
 * урожаи (по единицам), болезни/вредители, поливы за указанный год.
 */
export const getSeasonStats = query({
  args: { gardenId: v.id("gardens"), year: v.number() },
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);
    if (!userId) return null;

    const garden = await ctx.db.get(args.gardenId);
    if (!garden || garden.ownerId !== userId) return null;

    const inYear = (ts: number) => new Date(ts).getFullYear() === args.year;

    const plantings = await ctx.db
      .query("plantings")
      .withIndex("by_garden", (q) => q.eq("gardenId", args.gardenId))
      .collect();

    const plantingsStarted = plantings.filter((p) => inYear(p.plantedAt)).length;
    const deaths = plantings.filter(
      (p) => p.status === "dead" && p.endedAt !== undefined && inYear(p.endedAt),
    ).length;
    const plantingsActive = plantings.filter((p) => p.status === "active").length;

    let harvestCount = 0;
    const harvestByUnit = new Map<string, number>();
    let diseaseCount = 0;
    let pestCount = 0;
    let wateringCount = 0;
    let totalEventsInYear = 0;

    for (const planting of plantings) {
      const events = await ctx.db
        .query("journalEvents")
        .withIndex("by_planting", (q) => q.eq("plantingId", planting._id))
        .collect();

      for (const event of events) {
        if (!inYear(event.eventDate)) continue;
        totalEventsInYear++;

        if (event.eventType === "harvest") {
          harvestCount++;
          const qty = event.metadata?.harvest?.quantity;
          if (qty != null) {
            const unit = event.metadata?.harvest?.unit ?? "шт";
            harvestByUnit.set(unit, (harvestByUnit.get(unit) ?? 0) + qty);
          }
        } else if (event.eventType === "disease") {
          diseaseCount++;
        } else if (event.eventType === "pest") {
          pestCount++;
        } else if (event.eventType === "watering") {
          wateringCount++;
        }
      }
    }

    return {
      year: args.year,
      plantingsStarted,
      plantingsActive,
      deaths,
      harvestCount,
      harvestByUnit: Array.from(harvestByUnit.entries()).map(([unit, quantity]) => ({
        unit,
        quantity,
      })),
      diseaseCount,
      pestCount,
      wateringCount,
      totalEventsInYear,
    };
  },
});
