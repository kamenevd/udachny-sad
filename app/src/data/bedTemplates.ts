/**
 * PLAN12 задача 7 — готовые схемы клумб.
 *
 * Каждый шаблон — набор растений справочника (`catalogId` из plantCatalog.json)
 * с количеством и ярусом посадки. Ярус решает, куда растение попадает внутри
 * контура объекта при применении шаблона на канвас (задача 9):
 *   center — высокая доминанта в глубине/центре,
 *   middle — средний пояс,
 *   edge   — низкий бордюр по краю.
 *
 * Составы подобраны под Подмосковье (зона 4) и согласованы по требованиям к
 * свету/влаге внутри одного шаблона — иначе советник (задача 10) сразу же
 * ругался бы на собственную рекомендацию.
 */

import type { MoistureNeed, SoilType, SunExposure } from '../types/plant';

export type BedTier = 'center' | 'middle' | 'edge';

export const BED_TIERS: { tier: BedTier; label: string }[] = [
  { tier: 'center', label: 'Центр / задний план' },
  { tier: 'middle', label: 'Средний пояс' },
  { tier: 'edge', label: 'Край' },
];

export function bedTierLabel(tier: BedTier): string {
  return BED_TIERS.find((t) => t.tier === tier)?.label ?? tier;
}

export interface BedTemplateEntry {
  catalogId: string;
  quantity: number;
  tier: BedTier;
}

export interface BedTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  /** Типы объектов схемы, к которым шаблон применим (schemaObjects.type) */
  objectTypes: string[];
  sunExposure: SunExposure;
  soilType: SoilType;
  moisture: MoistureNeed;
  entries: BedTemplateEntry[];
}

export const BED_TEMPLATES: BedTemplate[] = [
  {
    id: 'mixborder',
    name: 'Миксбордер',
    icon: '🌈',
    description:
      'Многоярусный цветник вдоль дорожки или забора: высокие свечи в глубине, средний пояс из многолетников, низкий край. Цветёт с мая по сентябрь.',
    objectTypes: ['flowerbed', 'composition'],
    sunExposure: 'full_sun',
    soilType: 'loamy',
    moisture: 'medium',
    entries: [
      { catalogId: 'delphinium-elatum', quantity: 3, tier: 'center' },
      { catalogId: 'hydrangea-paniculata', quantity: 1, tier: 'center' },
      { catalogId: 'phlox-paniculata', quantity: 5, tier: 'middle' },
      { catalogId: 'echinacea-purpurea', quantity: 5, tier: 'middle' },
      { catalogId: 'hemerocallis', quantity: 3, tier: 'middle' },
      { catalogId: 'alchemilla-mollis', quantity: 7, tier: 'edge' },
      { catalogId: 'heuchera', quantity: 5, tier: 'edge' },
    ],
  },
  {
    id: 'rockery',
    name: 'Альпийская горка',
    icon: '⛰️',
    description:
      'Каменистый сад на сухом солнечном склоне. Хвойные-карлики держат структуру круглый год, почвопокровные затягивают промежутки между камнями.',
    objectTypes: ['flowerbed', 'composition'],
    sunExposure: 'full_sun',
    soilType: 'sandy',
    moisture: 'low',
    entries: [
      { catalogId: 'pinus-mugo', quantity: 1, tier: 'center' },
      { catalogId: 'juniperus-sabina', quantity: 2, tier: 'middle' },
      { catalogId: 'sedum-spectabile', quantity: 5, tier: 'middle' },
      { catalogId: 'berberis-thunbergii', quantity: 1, tier: 'middle' },
      { catalogId: 'crocus-vernus', quantity: 20, tier: 'edge' },
      { catalogId: 'muscari-armeniacum', quantity: 15, tier: 'edge' },
    ],
  },
  {
    id: 'rosarium',
    name: 'Розарий',
    icon: '🌹',
    description:
      'Парадный цветник из роз разных групп. Хвойные рядом не сажаем — они подкисляют почву и делят с розами воду.',
    objectTypes: ['flowerbed', 'composition'],
    sunExposure: 'full_sun',
    soilType: 'loamy',
    moisture: 'medium',
    entries: [
      { catalogId: 'rose-climbing', quantity: 2, tier: 'center' },
      { catalogId: 'rose-tea-hybrid', quantity: 5, tier: 'middle' },
      { catalogId: 'rose-floribunda', quantity: 5, tier: 'middle' },
      { catalogId: 'rose-ground-cover', quantity: 7, tier: 'edge' },
      { catalogId: 'alchemilla-mollis', quantity: 5, tier: 'edge' },
    ],
  },
  {
    id: 'border',
    name: 'Бордюр',
    icon: '📏',
    description:
      'Низкая непрерывная лента вдоль дорожки — до 40 см высотой, чтобы не перекрывать вид на участок.',
    objectTypes: ['flowerbed', 'hedge', 'path'],
    sunExposure: 'full_sun',
    soilType: 'any',
    moisture: 'medium',
    entries: [
      { catalogId: 'thuja-danica', quantity: 3, tier: 'center' },
      { catalogId: 'spiraea-japonica', quantity: 3, tier: 'middle' },
      { catalogId: 'heuchera', quantity: 7, tier: 'edge' },
      { catalogId: 'ageratum-houstonianum', quantity: 12, tier: 'edge' },
      { catalogId: 'lobelia-erinus', quantity: 12, tier: 'edge' },
    ],
  },
  {
    id: 'parterre',
    name: 'Партерный цветник',
    icon: '🎪',
    description:
      'Регулярный цветник у входа: строгая геометрия и сплошное яркое цветение из однолетников, которые высаживают рассадой в июне.',
    objectTypes: ['flowerbed', 'composition'],
    sunExposure: 'full_sun',
    soilType: 'loamy',
    moisture: 'medium',
    entries: [
      { catalogId: 'salvia-splendens', quantity: 9, tier: 'center' },
      { catalogId: 'zinnia-elegans', quantity: 9, tier: 'middle' },
      { catalogId: 'petunia-hybrida', quantity: 15, tier: 'middle' },
      { catalogId: 'tagetes-patula', quantity: 15, tier: 'edge' },
      { catalogId: 'ageratum-houstonianum', quantity: 12, tier: 'edge' },
    ],
  },
];

export function bedTemplateById(id: string): BedTemplate | undefined {
  return BED_TEMPLATES.find((t) => t.id === id);
}

/** Шаблоны, подходящие типу объекта схемы (задача 9) */
export function templatesForObjectType(type: string): BedTemplate[] {
  return BED_TEMPLATES.filter((t) => t.objectTypes.includes(type));
}

/** Сколько всего саженцев предполагает шаблон — показываем в карточке */
export function templateTotalCount(template: BedTemplate): number {
  return template.entries.reduce((sum, e) => sum + e.quantity, 0);
}
