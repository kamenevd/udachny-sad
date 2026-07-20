/**
 * Генерирует pb_migrations/005_plan12_seed_plants.js из src/data/plantCatalog.json,
 * чтобы справочник на фронте и seed на бэкенде не расходились (PLAN12 задача 2).
 *
 *   node scripts/gen-seed-migration.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const catalog = JSON.parse(
  readFileSync(resolve(here, '../src/data/plantCatalog.json'), 'utf8'),
);

const seed = catalog.map((p) => ({
  catalogId: p.catalogId,
  plantType: p.plantType,
  name: p.name,
  description: p.description,
  latin_name: p.latinName,
  bloom_months: p.bloomMonths,
  sun_exposure: p.sunExposure,
  soil_type: p.soilType,
  moisture: p.moisture,
  primary_color: p.primaryColor,
  height_cm: p.heightCm,
  incompatible_ids: p.incompatibleIds,
}));

const out = `/// <reference path="../pb_data/types.d.ts" />
/**
 * PLAN12 задача 2 — предзаполнение справочника декоративными растениями
 * (${seed.length} видов, климат Подмосковья, зона зимостойкости 4).
 *
 * ⚠️ Файл СГЕНЕРИРОВАН из app/src/data/plantCatalog.json скриптом
 * app/scripts/gen-seed-migration.mjs — правьте JSON и перегенерируйте,
 * иначе справочник фронта и seed бэкенда разойдутся.
 *
 * Записи \`plants\` привязаны к пользователю (userId, cascadeDelete), поэтому
 * seed раскладывает каталог по всем существующим на момент миграции юзерам.
 * Для тех, кто зарегистрируется позже, тот же каталог доступен на фронте —
 * кнопка «Загрузить примеры растений» на пустом экране справочника (задача 13).
 * Повторный запуск безопасен: растение с таким catalogId у юзера пропускается.
 */
const SEED_PLANTS = ${JSON.stringify(seed, null, 2)};

migrate((app) => {
  const users = app.findAllRecords("users");
  for (const user of users) {
    for (const plant of SEED_PLANTS) {
      // findFirstRecordByFilter бросает исключение, если записи нет, —
      // «не найдено» здесь нормальный путь, поэтому ловим и продолжаем.
      let existing = null;
      try {
        existing = app.findFirstRecordByFilter(
          "plants",
          "userId = {:uid} && catalogId = {:cid}",
          { uid: user.id, cid: plant.catalogId },
        );
      } catch (err) {
        existing = null;
      }
      if (existing) continue;

      const record = new Record(app.findCollectionByNameOrId("plants"));
      record.set("userId", user.id);
      for (const [key, value] of Object.entries(plant)) {
        record.set(key, value);
      }
      app.save(record);
    }
  }
}, (app) => {
  const ids = SEED_PLANTS.map((p) => p.catalogId);
  for (const catalogId of ids) {
    const records = app.findAllRecords("plants", $dbx.hashExp({ catalogId: catalogId }));
    for (const record of records) {
      app.delete(record);
    }
  }
});
`;

const target = resolve(here, '../../pb_migrations/005_plan12_seed_plants.js');
writeFileSync(target, out);
console.log(`wrote ${target} (${seed.length} plants)`);
