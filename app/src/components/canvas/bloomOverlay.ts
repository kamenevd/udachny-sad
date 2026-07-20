/**
 * PLAN12 задача 6 — сезонность на канвасе.
 *
 * Считает по активным посадкам, какие объекты схемы цветут в выбранном месяце
 * и каким цветом их подсвечивать. Вынесено из GardenDetail отдельным модулем:
 * логика чистая, её гоняют тесты (bloomingCalendar.test.ts).
 */

import { bloomsIn } from '../../hooks/useBloomingSeasons';
import type { Plant } from '../../lib/pb';

/** Минимум от посадки, нужный для расчёта — совместим с PlantingWithPlant */
export interface BloomPlantingInput {
  schemaObjectId?: string;
  plant: Pick<Plant, 'bloom_months' | 'primary_color'> | null;
}

export interface ObjectBloomState {
  /** Цвет цветения — заливка подсветки; null, если объект в этом месяце не цветёт */
  color: string | null;
  /** Цветёт ли на объекте хоть одно растение в выбранном месяце */
  blooming: boolean;
  /** Сколько растений объекта цветёт — показываем в подписи объекта */
  bloomingCount: number;
}

/**
 * Состояние цветения по id объекта схемы. Если на объекте цветёт несколько
 * растений, цвет берём у первого — на канвасе объект всё равно закрашивается
 * одним тоном, а полный список виден в карточке места.
 */
export function computeBloomStates(
  plantings: BloomPlantingInput[],
  month: number | null,
): Map<string, ObjectBloomState> {
  const states = new Map<string, ObjectBloomState>();
  if (month === null) return states;

  for (const planting of plantings) {
    const objectId = planting.schemaObjectId;
    if (!objectId) continue;

    const prev = states.get(objectId) ?? { color: null, blooming: false, bloomingCount: 0 };
    const plant = planting.plant;
    const blooms = plant != null && bloomsIn(plant, month);

    states.set(objectId, {
      color: prev.color ?? (blooms ? (plant?.primary_color ?? null) : null),
      blooming: prev.blooming || blooms,
      bloomingCount: prev.bloomingCount + (blooms ? 1 : 0),
    });
  }

  return states;
}
