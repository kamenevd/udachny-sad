/**
 * pbStats — клиентские аналоги convex/stats.ts (getStreak, getSeasonStats).
 *
 * PocketBase не имеет serverless-функций (в отличие от Convex query/mutation) —
 * агрегации, которые раньше считались на сервере, экраны считают сами на
 * клиенте после fetch'а нужных записей через app/src/lib/pb.ts. Для MVP это
 * приемлемо: ограничение "один участок на пользователя" (gardens.create,
 * задача C.2) держит объём данных на клиенте небольшим.
 */
import { journalEvents as journalEventsApi, plantings as plantingsApi } from "./pb";

export interface StreakResult {
  days: number;
  hasToday: boolean;
}

function dayKey(ts: number | string): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Портировано 1:1 из convex/stats.ts getStreak — серия дней с записями в журнале одного участка. */
export async function getStreak(gardenId: string): Promise<StreakResult> {
  return getStreakForGardens([gardenId]);
}

/** Как getStreak, но по всем переданным участкам сразу (convex-версия без gardenId — все участки пользователя). */
export async function getStreakForGardens(gardenIds: string[]): Promise<StreakResult> {
  if (gardenIds.length === 0) return { days: 0, hasToday: false };

  const plantings = (
    await Promise.all(gardenIds.map((id) => plantingsApi.list({ filter: `gardenId="${id}"` })))
  ).flat();
  if (plantings.length === 0) return { days: 0, hasToday: false };

  const daySet = new Set<string>();
  for (const planting of plantings) {
    const events = await journalEventsApi.list({ filter: `plantingId="${planting.id}"` });
    for (const ev of events) daySet.add(dayKey(ev.eventDate));
  }
  if (daySet.size === 0) return { days: 0, hasToday: false };

  const now = new Date();
  const todayKey = dayKey(now.getTime());
  const hasToday = daySet.has(todayKey);

  const start = new Date(now);
  if (!hasToday) start.setDate(start.getDate() - 1);

  let days = 0;
  for (let i = 0; i < 366; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() - i);
    if (daySet.has(dayKey(d.getTime()))) days++;
    else break;
  }

  return { days, hasToday };
}

export interface SeasonStats {
  year: number;
  plantingsStarted: number;
  plantingsActive: number;
  deaths: number;
  harvestCount: number;
  harvestByUnit: { unit: string; quantity: number }[];
  diseaseCount: number;
  pestCount: number;
  wateringCount: number;
  totalEventsInYear: number;
}

/** Портировано 1:1 из convex/stats.ts getSeasonStats — годовой отчёт по участку (задача 33.1). */
export async function getSeasonStats(gardenId: string, year: number): Promise<SeasonStats> {
  const inYear = (ts: number | string) => new Date(ts).getFullYear() === year;

  const plantings = await plantingsApi.list({ filter: `gardenId="${gardenId}"` });

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
    const events = await journalEventsApi.list({ filter: `plantingId="${planting.id}"` });

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
    year,
    plantingsStarted,
    plantingsActive,
    deaths,
    harvestCount,
    harvestByUnit: Array.from(harvestByUnit.entries()).map(([unit, quantity]) => ({ unit, quantity })),
    diseaseCount,
    pestCount,
    wateringCount,
    totalEventsInYear,
  };
}
