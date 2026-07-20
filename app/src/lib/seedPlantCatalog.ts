/**
 * PLAN12 задача 13 — загрузка примеров растений в пустой справочник.
 *
 * Тот же каталог, что раскладывает seed-миграция 005_plan12_seed_plants.js, но
 * по кнопке и для текущего пользователя: миграция отработала один раз на
 * существующих юзерах, а зарегистрировавшиеся позже начинают с пустого
 * справочника и наполняют его отсюда.
 *
 * Повторный вызов не дублирует записи — уже загруженные catalogId пропускаются.
 */

import { pb, plants as plantsApi, type Plant } from './pb';
import { PLANT_CATALOG, catalogToPlantFields } from '../data/plantCatalog';

export interface SeedCatalogResult {
  added: number;
  skipped: number;
}

export async function seedPlantCatalog(): Promise<SeedCatalogResult> {
  const userId = pb.authStore.record?.id ?? '';

  const existing = await plantsApi.list({ filter: 'catalogId != ""' });
  const known = new Set(existing.map((p) => p.catalogId).filter(Boolean));

  let added = 0;
  let skipped = 0;

  for (const entry of PLANT_CATALOG) {
    if (known.has(entry.catalogId)) {
      skipped += 1;
      continue;
    }
    await plantsApi.create({
      ...catalogToPlantFields(entry),
      userId,
    } as Partial<Plant>);
    added += 1;
  }

  return { added, skipped };
}
