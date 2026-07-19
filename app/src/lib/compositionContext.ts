/**
 * Задача H.2 — контекст клумбы/композиции из истории места.
 *
 * Когда садовод выбирает клумбу или композицию на канве, полезно сразу увидеть
 * подсказку: какая тут освещённость и что росло в прошлом сезоне (и не было ли
 * болезней) — это влияет на планирование посадок. Здесь чистая сборка контекста (buildCompositionContext,
 * покрыта тестами) и async-загрузчик поверх PocketBase (loadCompositionContext).
 */
import {
  journalEvents as journalEventsApi,
  type LightZone,
} from "./pb";
import { getHistory } from "./pbPlantings";

export type LightCondition = LightZone["condition"];

export const CONDITION_LABEL: Record<LightCondition, string> = {
  sunny: "Солнечно",
  partial_shade: "Полутень",
  shade: "Тень",
};

/** Одна прошлая посадка на клумбе/в композиции для сборки контекста. */
export interface CompositionHistoryPlanting {
  plantName: string;
  /** ISO-дата посадки. */
  plantedAt: string;
  /** Диагнозы болезней/вредителей за ту посадку. */
  diseases: string[];
}

export interface CompositionContextLastSeason {
  year: number;
  /** «В прошлом году» либо «В 2023 году». */
  label: string;
  plants: { plantName: string; diseases: string[] }[];
}

export interface CompositionContext {
  /** Подпись освещённости (доминирующее условие пересекающих зон). */
  lightLabel?: string;
  lastSeason?: CompositionContextLastSeason;
  /** Сколько сезонов (лет) есть в истории места. */
  seasonsTracked: number;
}

/** Доминирующее (самое частое) условие освещённости → подпись. */
export function dominantLightLabel(conditions: LightCondition[]): string | undefined {
  if (conditions.length === 0) return undefined;
  const counts = new Map<LightCondition, number>();
  for (const c of conditions) counts.set(c, (counts.get(c) ?? 0) + 1);
  let best: LightCondition = conditions[0];
  let bestN = 0;
  for (const [c, n] of counts) {
    if (n > bestN) {
      best = c;
      bestN = n;
    }
  }
  return CONDITION_LABEL[best];
}

function yearOf(iso: string): number {
  return new Date(iso).getFullYear();
}

/** Ray-casting: лежит ли точка внутри полигона [[x,y],…]. */
export function pointInPolygon(
  point: { x: number; y: number },
  polygon: number[][],
): boolean {
  const { x, y } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Собирает контекст: освещённость + прошлый сезон. «Прошлый сезон» — самый
 * свежий год строго раньше текущего; если таких нет — не показываем.
 */
export function buildCompositionContext(
  history: CompositionHistoryPlanting[],
  conditions: LightCondition[],
  now: number = Date.now(),
): CompositionContext {
  const lightLabel = dominantLightLabel(conditions);
  const currentYear = new Date(now).getFullYear();

  const years = history.map((h) => yearOf(h.plantedAt));
  const seasonsTracked = new Set(years).size;

  const pastYears = years.filter((y) => y < currentYear);
  let lastSeason: CompositionContextLastSeason | undefined;
  if (pastYears.length > 0) {
    const year = Math.max(...pastYears);
    const plants = history
      .filter((h) => yearOf(h.plantedAt) === year)
      .map((h) => ({ plantName: h.plantName, diseases: h.diseases }));
    lastSeason = {
      year,
      label: year === currentYear - 1 ? "В прошлом году" : `В ${year} году`,
      plants,
    };
  }

  return { lightLabel, lastSeason, seasonsTracked };
}

/**
 * Загружает контекст клумбы/композиции из PocketBase: история посадок + болезни
 * (события disease/pest только для прошлогодних посадок — чтобы не тянуть лишнее).
 * `conditions` — условия освещённости пересекающих объект зон (из GardenDetail).
 */
export async function loadCompositionContext(
  schemaObjectId: string,
  conditions: LightCondition[],
  now: number = Date.now(),
): Promise<CompositionContext> {
  let historyRecords: Awaited<ReturnType<typeof getHistory>> = [];
  try {
    historyRecords = await getHistory(schemaObjectId);
  } catch {
    historyRecords = [];
  }

  const currentYear = new Date(now).getFullYear();

  const history: CompositionHistoryPlanting[] = await Promise.all(
    historyRecords.map(async (p) => {
      const plantName = p.plant?.name ?? p.notes ?? "Посадка";
      // Болезни тянем только для прошлогодних посадок.
      let diseases: string[] = [];
      if (yearOf(p.plantedAt) < currentYear) {
        try {
          const events = await journalEventsApi.list({
            filter: `plantingId="${p.id}" && (eventType="disease" || eventType="pest")`,
          });
          diseases = events
            .map((e) => e.metadata?.diagnosis ?? e.title ?? "")
            .filter((s): s is string => s.trim() !== "");
        } catch {
          diseases = [];
        }
      }
      return { plantName, plantedAt: p.plantedAt, diseases };
    }),
  );

  return buildCompositionContext(history, conditions, now);
}
