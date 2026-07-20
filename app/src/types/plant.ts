/**
 * PLAN12 задача 1 — характеристики декоративного растения.
 *
 * Поля живут в коллекции `plants` (миграция 004_plan12_plant_fields.js) и в
 * справочнике-заготовке `src/data/plantCatalog.json` (задача 2). Имена полей
 * записи PocketBase — snake_case, как в миграции; в справочнике-JSON —
 * camelCase, конвертация в `catalogToPlantFields()` (src/data/plantCatalog.ts).
 */

/** Освещение, при котором растение раскрывается лучше всего */
export type SunExposure = 'full_sun' | 'partial_shade' | 'full_shade';

/** Тип почвы; `any` — растение нетребовательно */
export type SoilType = 'sandy' | 'loamy' | 'clay' | 'any';

/** Потребность в поливе */
export type MoistureNeed = 'low' | 'medium' | 'high';

/** Категория справочника (расширяет 4 базовых типа PLAN до 7) */
export type PlantCategory =
  | 'tree' | 'shrub' | 'perennial' | 'annual' | 'conifer' | 'rose' | 'bulb';

/** Характеристики, добавляемые к записи `plants` (snake_case = поля PocketBase) */
export interface PlantTraits {
  /** Месяцы цветения, 1-12. Пустой массив — декоративнолистное/хвойное */
  bloom_months?: number[];
  sun_exposure?: SunExposure;
  soil_type?: SoilType;
  moisture?: MoistureNeed;
  /** Основной цвет цветения, hex `#RRGGBB` — им подсвечивается объект на канвасе */
  primary_color?: string;
  height_cm?: number;
  /** `catalogId` растений, которые плохо уживаются рядом (задача 10) */
  incompatible_ids?: string[];
  latin_name?: string;
}

export const SUN_EXPOSURES: { value: SunExposure; label: string; icon: string }[] = [
  { value: 'full_sun', label: 'Солнце', icon: '☀️' },
  { value: 'partial_shade', label: 'Полутень', icon: '⛅' },
  { value: 'full_shade', label: 'Тень', icon: '🌑' },
];

export const SOIL_TYPES: { value: SoilType; label: string; icon: string }[] = [
  { value: 'sandy', label: 'Песчаная', icon: '🏖️' },
  { value: 'loamy', label: 'Суглинок', icon: '🟤' },
  { value: 'clay', label: 'Глинистая', icon: '🧱' },
  { value: 'any', label: 'Любая', icon: '🌍' },
];

export const MOISTURE_NEEDS: { value: MoistureNeed; label: string; icon: string }[] = [
  { value: 'low', label: 'Сухо', icon: '🏜️' },
  { value: 'medium', label: 'Умеренно', icon: '💧' },
  { value: 'high', label: 'Влажно', icon: '🌊' },
];

/** Месяцы для календаря цветения (задача 3). Индекс массива + 1 = номер месяца */
export const MONTHS_RU = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
] as const;

/** Родительный падеж — для фразы «что цветёт в июне» */
export const MONTHS_RU_IN = [
  'январе', 'феврале', 'марте', 'апреле', 'мае', 'июне',
  'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре',
] as const;

export function monthLabel(month: number): string {
  return MONTHS_RU[month - 1] ?? String(month);
}

export function sunExposureLabel(value?: string): string {
  return SUN_EXPOSURES.find((s) => s.value === value)?.label ?? '—';
}

export function soilTypeLabel(value?: string): string {
  return SOIL_TYPES.find((s) => s.value === value)?.label ?? '—';
}

export function moistureLabel(value?: string): string {
  return MOISTURE_NEEDS.find((m) => m.value === value)?.label ?? '—';
}
