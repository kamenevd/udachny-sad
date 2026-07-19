/**
 * zoneConditions — чистые данные по условиям зон (свет/влага), без Konva.
 * Вынесено из ZonesLayer.tsx (задача 17.3), чтобы экраны, которым нужны
 * только эти константы (например GardenDetail — переключатель слоя),
 * не тянули react-konva/konva в свой eager-чанк.
 */

export type ZoneLayerKind = 'light' | 'moisture';

export const ZONE_CONDITIONS: Record<ZoneLayerKind, { condition: string; label: string }[]> = {
  light: [
    { condition: 'sunny', label: 'Солнце' },
    { condition: 'partial_shade', label: 'Полутень' },
    { condition: 'shade', label: 'Тень' },
  ],
  moisture: [
    { condition: 'dry', label: 'Сухо' },
    { condition: 'moderate', label: 'Умеренно' },
    { condition: 'wet', label: 'Влажно' },
  ],
};

export function zoneConditionLabel(condition: string): string {
  for (const list of Object.values(ZONE_CONDITIONS)) {
    const found = list.find((c) => c.condition === condition);
    if (found) return found.label;
  }
  return condition;
}
