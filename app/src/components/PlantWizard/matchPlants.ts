/**
 * PLAN12 задача 8 — подбор растений по ответам мастера.
 *
 * Логика чистая (без React), её гоняет plantWizard.test.ts.
 *
 * Подбор — не жёсткий фильтр, а ранжирование: жёсткое отсечение по 5 шагам
 * почти всегда даёт пустой результат, поэтому каждое условие даёт очки, а
 * растения ниже порога отсеиваются. Так мастер всегда возвращает осмысленный
 * список, а идеальные совпадения оказываются сверху.
 */

import type { CatalogPlant } from '../../data/plantCatalog';
import { PLANT_CATALOG } from '../../data/plantCatalog';
import { bedTemplateById } from '../../data/bedTemplates';
import type { MoistureNeed, SoilType, SunExposure } from '../../types/plant';

/** Цветовая гамма — шаг 5 мастера */
export type ColorFamily = 'warm' | 'cool' | 'white' | 'any';

/** Диапазон высоты — шаг 4 мастера */
export type HeightBand = 'low' | 'medium' | 'tall' | 'any';

export const HEIGHT_BANDS: {
  value: HeightBand; label: string; icon: string; max: number; min: number;
}[] = [
  { value: 'low', label: 'До 40 см', icon: '🌱', min: 0, max: 40 },
  { value: 'medium', label: '40-120 см', icon: '🌿', min: 40, max: 120 },
  { value: 'tall', label: 'Выше 120 см', icon: '🌳', min: 120, max: Infinity },
  { value: 'any', label: 'Не важно', icon: '🤷', min: 0, max: Infinity },
];

export const COLOR_FAMILIES: { value: ColorFamily; label: string; icon: string }[] = [
  { value: 'warm', label: 'Тёплая', icon: '🔥' },
  { value: 'cool', label: 'Холодная', icon: '❄️' },
  { value: 'white', label: 'Белая / пастель', icon: '🤍' },
  { value: 'any', label: 'Любая', icon: '🎨' },
];

export interface WizardCriteria {
  /** id шаблона клумбы (шаг 1); растения его состава получают бонус */
  templateId?: string;
  sunExposure?: SunExposure;
  soilType?: SoilType;
  moisture?: MoistureNeed;
  height?: HeightBand;
  color?: ColorFamily;
}

export interface PlantMatch {
  plant: CatalogPlant;
  score: number;
  /** Причины совпадения — показываем под названием в результатах */
  reasons: string[];
}

/** hex `#RRGGBB` → цветовая семья по тону и насыщенности */
export function colorFamilyOf(hex: string): ColorFamily {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 'any';
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  // Бледное или почти серое — белая/пастельная гамма
  if (delta < 0.12 || min > 0.8) return 'white';

  let hue: number;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  hue = (hue * 60 + 360) % 360;

  // Красно-жёлтый сектор — тёплые, сине-зелёно-фиолетовый — холодные
  return hue < 75 || hue >= 330 ? 'warm' : 'cool';
}

const HEIGHT_BAND_BY_VALUE = new Map(HEIGHT_BANDS.map((b) => [b.value, b]));

export function matchesHeight(heightCm: number, band: HeightBand): boolean {
  const spec = HEIGHT_BAND_BY_VALUE.get(band);
  if (!spec || band === 'any') return true;
  return heightCm >= spec.min && heightCm < spec.max;
}

/**
 * Прямое противоречие по свету: светолюбивое в глухой тени (или наоборот).
 * Единственное жёсткое условие мастера — остальные требования это вопрос вкуса
 * и их можно взвешивать, а без света растение просто не выживет, сколько бы
 * очков оно ни набрало по почве и высоте.
 */
export function isSunIncompatible(plant: CatalogPlant, wanted: SunExposure): boolean {
  if (plant.sunExposure === wanted) return false;
  // Полутень — компромиссная зона, она соседствует и с солнцем, и с тенью.
  return plant.sunExposure !== 'partial_shade' && wanted !== 'partial_shade';
}

/** Совместимо ли освещение: растение полутени переносит и тень, и солнце хуже */
function sunScore(plant: CatalogPlant, wanted: SunExposure): number {
  if (plant.sunExposure === wanted) return 3;
  if (isSunIncompatible(plant, wanted)) return -3;
  return 1;
}

function soilScore(plant: CatalogPlant, wanted: SoilType): number {
  if (plant.soilType === 'any' || wanted === 'any') return 1;
  return plant.soilType === wanted ? 2 : -1;
}

function moistureScore(plant: CatalogPlant, wanted: MoistureNeed): number {
  if (plant.moisture === wanted) return 2;
  const order: MoistureNeed[] = ['low', 'medium', 'high'];
  // Соседние ступени (сухо↔умеренно) — приемлемо, крайности — нет.
  return Math.abs(order.indexOf(plant.moisture) - order.indexOf(wanted)) === 1 ? 0 : -2;
}

/** Порог отсечения: ниже него совпадение считается противоречивым */
export const MATCH_THRESHOLD = 0;

export function scorePlant(plant: CatalogPlant, criteria: WizardCriteria): PlantMatch {
  let score = 0;
  const reasons: string[] = [];

  const template = criteria.templateId ? bedTemplateById(criteria.templateId) : undefined;
  if (template?.entries.some((e) => e.catalogId === plant.catalogId)) {
    score += 4;
    reasons.push(`Входит в шаблон «${template.name}»`);
  }

  if (criteria.sunExposure) {
    const s = sunScore(plant, criteria.sunExposure);
    score += s;
    if (s >= 3) reasons.push('Подходит по освещению');
  }

  if (criteria.soilType) {
    const s = soilScore(plant, criteria.soilType);
    score += s;
    if (s >= 2) reasons.push('Подходит по почве');
  }

  if (criteria.moisture) {
    const s = moistureScore(plant, criteria.moisture);
    score += s;
    if (s >= 2) reasons.push('Подходит по влаге');
  }

  if (criteria.height && criteria.height !== 'any') {
    if (matchesHeight(plant.heightCm, criteria.height)) {
      score += 2;
      reasons.push('Подходит по высоте');
    } else {
      score -= 3;
    }
  }

  if (criteria.color && criteria.color !== 'any') {
    if (colorFamilyOf(plant.primaryColor) === criteria.color) {
      score += 2;
      reasons.push('Подходит по цвету');
    } else {
      score -= 2;
    }
  }

  return { plant, score, reasons };
}

/**
 * Отранжированный список подходящих растений. `limit` ограничивает выдачу —
 * мастер показывает топ, а не весь справочник.
 */
export function matchPlants(
  criteria: WizardCriteria,
  catalog: CatalogPlant[] = PLANT_CATALOG,
  limit = 12,
): PlantMatch[] {
  const wantedSun = criteria.sunExposure;
  return catalog
    .filter((plant) => !wantedSun || !isSunIncompatible(plant, wantedSun))
    .map((plant) => scorePlant(plant, criteria))
    .filter((m) => m.score > MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score || a.plant.name.localeCompare(b.plant.name, 'ru'))
    .slice(0, limit);
}
