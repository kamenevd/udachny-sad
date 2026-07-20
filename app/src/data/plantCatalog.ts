/**
 * PLAN12 задача 2 — справочник 40+ декоративных растений для Подмосковья
 * (зона зимостойкости 4).
 *
 * Данные лежат в `plantCatalog.json` — тот же файл встроен в seed-миграцию
 * `pb_migrations/005_plan12_seed_plants.js` (генерируется скриптом
 * `scripts/gen-seed-migration.mjs`), поэтому фронт и бэкенд не расходятся.
 */

import raw from './plantCatalog.json';
import type {
  MoistureNeed, PlantCategory, PlantTraits, SoilType, SunExposure,
} from '../types/plant';

export interface CatalogPlant {
  catalogId: string;
  plantType: PlantCategory;
  name: string;
  latinName: string;
  description: string;
  bloomMonths: number[];
  sunExposure: SunExposure;
  soilType: SoilType;
  moisture: MoistureNeed;
  primaryColor: string;
  heightCm: number;
  incompatibleIds: string[];
}

export const PLANT_CATALOG: CatalogPlant[] = raw as CatalogPlant[];

export function catalogById(catalogId: string): CatalogPlant | undefined {
  return PLANT_CATALOG.find((p) => p.catalogId === catalogId);
}

/**
 * Справочная запись → поля записи `plants` (без `userId`, его подставляет
 * вызывающий). Используется кнопкой «Загрузить примеры растений» (задача 13).
 */
export function catalogToPlantFields(
  p: CatalogPlant,
): PlantTraits & {
  plantType: string; name: string; description: string; catalogId: string;
} {
  return {
    plantType: p.plantType,
    name: p.name,
    description: p.description,
    catalogId: p.catalogId,
    latin_name: p.latinName,
    bloom_months: p.bloomMonths,
    sun_exposure: p.sunExposure,
    soil_type: p.soilType,
    moisture: p.moisture,
    primary_color: p.primaryColor,
    height_cm: p.heightCm,
    incompatible_ids: p.incompatibleIds,
  };
}
