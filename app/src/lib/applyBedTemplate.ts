/**
 * PLAN12 задача 9 — применение шаблона клумбы на канвас.
 *
 * Шаблон хранит только `catalogId` растений, а посадка ссылается на запись
 * `plants` конкретного пользователя. Поэтому применение — два шага:
 *   1) добираем в справочник пользователя недостающие карточки из каталога,
 *   2) создаём посадки внутри объекта схемы, помечая ярус в positionNote.
 *
 * Не атомарно — как и остальные многошаговые операции в pbPlantings.ts
 * (PocketBase без serverless-мутаций): при обрыве связи часть посадок
 * останется созданной. Поэтому возвращаем фактическое число созданных,
 * а не заявленное шаблоном.
 */

import { pb, plants as plantsApi, type Plant } from './pb';
import { createPlanting } from './pbPlantings';
import { PLANT_CATALOG, catalogToPlantFields } from '../data/plantCatalog';
import { bedTierLabel, type BedTemplate } from '../data/bedTemplates';

export interface ApplyBedTemplateArgs {
  template: BedTemplate;
  gardenId: string;
  schemaObjectId: string;
  /** Дата посадки ISO; по умолчанию — сегодня */
  plantedAt?: string;
}

export interface ApplyBedTemplateResult {
  /** Сколько посадок реально создано */
  created: number;
  /** Сколько карточек растений добавлено в справочник */
  plantsAdded: number;
  /** catalogId, которых нет в каталоге — шаблон и каталог разошлись */
  skipped: string[];
}

/**
 * Карточки растений пользователя по catalogId; недостающие создаются из
 * каталога. Возвращает карту catalogId → запись `plants`.
 */
async function ensurePlants(
  catalogIds: string[],
): Promise<{ byCatalogId: Map<string, Plant>; added: number; skipped: string[] }> {
  const unique = [...new Set(catalogIds)];
  const userId = pb.authStore.record?.id ?? '';

  const filter = unique.map((id) => `catalogId="${id}"`).join(' || ');
  const existing = filter ? await plantsApi.list({ filter }) : [];

  const byCatalogId = new Map<string, Plant>();
  for (const plant of existing) {
    if (plant.catalogId) byCatalogId.set(plant.catalogId, plant);
  }

  const skipped: string[] = [];
  let added = 0;

  for (const catalogId of unique) {
    if (byCatalogId.has(catalogId)) continue;

    const entry = PLANT_CATALOG.find((p) => p.catalogId === catalogId);
    if (!entry) {
      skipped.push(catalogId);
      continue;
    }

    const created = await plantsApi.create({
      ...catalogToPlantFields(entry),
      userId,
    } as Partial<Plant>);
    byCatalogId.set(catalogId, created);
    added += 1;
  }

  return { byCatalogId, added, skipped };
}

export async function applyBedTemplate({
  template,
  gardenId,
  schemaObjectId,
  plantedAt = new Date().toISOString().slice(0, 10),
}: ApplyBedTemplateArgs): Promise<ApplyBedTemplateResult> {
  const { byCatalogId, added, skipped } = await ensurePlants(
    template.entries.map((e) => e.catalogId),
  );

  let created = 0;
  for (const entry of template.entries) {
    const plant = byCatalogId.get(entry.catalogId);
    if (!plant) continue;

    // Одна посадка на позицию шаблона: quantity хранит число саженцев,
    // ярус — в positionNote, чтобы он был виден в истории места.
    await createPlanting({
      gardenId,
      plantId: plant.id,
      schemaObjectId,
      positionNote: bedTierLabel(entry.tier),
      plantedAt,
      quantity: entry.quantity,
      notes: `Шаблон «${template.name}»`,
    });
    created += 1;
  }

  return { created, plantsAdded: added, skipped };
}
