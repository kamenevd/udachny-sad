/**
 * PLAN12 задача 4 — фильтрация справочника по месяцу цветения.
 *
 * Источник данных — поле `bloom_months` (json-массив 1-12, задача 1).
 * Растения без него (хвойные, декоративнолистные) не цветут никогда и
 * выпадают из выборки при выбранном месяце — но остаются в общем списке.
 */

import { useMemo } from 'react';
import type { Plant } from '../lib/pb';

/** Месяцы цветения растения в нормализованном виде (мусор из json отсеян) */
export function bloomMonthsOf(plant: Pick<Plant, 'bloom_months'>): number[] {
  const raw = plant.bloom_months;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (m): m is number => typeof m === 'number' && Number.isInteger(m) && m >= 1 && m <= 12,
  );
}

/** Цветёт ли растение в указанном месяце (1-12) */
export function bloomsIn(plant: Pick<Plant, 'bloom_months'>, month: number): boolean {
  return bloomMonthsOf(plant).includes(month);
}

export interface UseBloomingSeasonsResult {
  /** Растения, цветущие в выбранном месяце; при `selectedMonth === null` — все */
  filtered: Plant[];
  /** Цветёт ли растение в выбранном месяце (false, если месяц не выбран) */
  isBlooming: (plant: Pick<Plant, 'bloom_months'>) => boolean;
  /** Сколько растений цветёт в каждом месяце: индекс 0 = январь */
  countByMonth: number[];
  /** Есть ли в справочнике хоть одно растение с заполненным bloom_months */
  hasBloomData: boolean;
}

export function useBloomingSeasons(
  plants: Plant[] | undefined,
  selectedMonth: number | null,
): UseBloomingSeasonsResult {
  return useMemo(() => {
    const list = plants ?? [];

    const countByMonth = new Array<number>(12).fill(0);
    let hasBloomData = false;
    for (const plant of list) {
      const months = bloomMonthsOf(plant);
      if (months.length > 0) hasBloomData = true;
      // Один и тот же месяц в json не должен считаться дважды.
      for (const month of new Set(months)) countByMonth[month - 1] += 1;
    }

    const filtered =
      selectedMonth === null ? list : list.filter((p) => bloomsIn(p, selectedMonth));

    const isBlooming = (plant: Pick<Plant, 'bloom_months'>) =>
      selectedMonth !== null && bloomsIn(plant, selectedMonth);

    return { filtered, isBlooming, countByMonth, hasBloomData };
  }, [plants, selectedMonth]);
}
