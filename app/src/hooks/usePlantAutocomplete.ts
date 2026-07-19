/**
 * usePlantAutocomplete — автозаполнение при вводе названия/сорта растения
 * (PLAN9 задача I.1).
 *
 * Локальная база популярных сортов (`plantVarieties.ru.json`) без сети —
 * работает офлайн. По подстроке в названии ИЛИ сорте возвращает ранжированные
 * подсказки с типом, примерной высотой и периодом цветения, чтобы форму
 * посадки можно было заполнить в один тап.
 */
import { useMemo } from 'react';
import raw from '../data/plantVarieties.ru.json';

/** Тип растения — совпадает с `PLANT_TYPES` (см. `screens/Plants.tsx`). */
export type PlantVarietyType = 'tree' | 'shrub' | 'perennial' | 'annual';

export interface PlantVariety {
  name: string;
  variety: string;
  type: PlantVarietyType;
  /** Примерная высота взрослого растения, см */
  heightCm: number;
  /** Период цветения (человекочитаемо), «—» если неактуально */
  bloom: string;
}

export const PLANT_VARIETIES: PlantVariety[] = raw as PlantVariety[];

/** Нормализация: нижний регистр + ё→е, чтобы «свекла» находила «свёкла». */
function norm(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е').trim();
}

/**
 * Ранг совпадения. Точное начало важнее вхождения; имя важнее сорта.
 * 0 — нет совпадения.
 */
function rank(item: PlantVariety, q: string): number {
  const name = norm(item.name);
  const variety = norm(item.variety);
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (variety.startsWith(q)) return 60;
  if (name.includes(q)) return 40;
  if (variety.includes(q)) return 30;
  return 0;
}

/**
 * Подсказки по подстроке. Пустой/короткий запрос → пустой список
 * (не заваливаем UI всей базой). `limit` ограничивает выдачу.
 */
export function suggestVarieties(query: string, limit = 8): PlantVariety[] {
  const q = norm(query);
  if (q.length < 2) return [];
  return PLANT_VARIETIES.map((item) => ({ item, r: rank(item, q) }))
    .filter((x) => x.r > 0)
    .sort((a, b) => b.r - a.r || a.item.name.localeCompare(b.item.name, 'ru'))
    .slice(0, limit)
    .map((x) => x.item);
}

export function usePlantAutocomplete(query: string, limit = 8): PlantVariety[] {
  return useMemo(() => suggestVarieties(query, limit), [query, limit]);
}
