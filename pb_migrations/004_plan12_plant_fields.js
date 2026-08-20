/// <reference path="../pb_data/types.d.ts" />
/**
 * PLAN12 задача 1 — характеристики декоративных растений в коллекции `plants`.
 *
 * Календарь цветения (задача 3-6), мастер подбора (задача 8) и AI-советник
 * (задача 10) читают именно эти поля. Все они необязательные — растения,
 * заведённые пользователем вручную до PLAN12, остаются валидными.
 *
 * Идемпотентность: каждое поле добавляется только если его ещё нет —
 * после 003b (реконсилиация живого сервера) часть полей (latin_name)
 * может уже существовать за счёт переименования легаси-колонок.
 */
migrate((app) => {
  const plants = app.findCollectionByNameOrId("plants");

  const specs = [
    // Месяцы цветения — json-массив номеров 1-12; пусто у хвойных.
    { name: "bloom_months", type: "json", required: false, maxSize: 200 },
    {
      name: "sun_exposure", type: "select", required: false, maxSelect: 1,
      values: ["full_sun", "partial_shade", "full_shade"],
    },
    {
      name: "soil_type", type: "select", required: false, maxSelect: 1,
      values: ["sandy", "loamy", "clay", "any"],
    },
    {
      name: "moisture", type: "select", required: false, maxSelect: 1,
      values: ["low", "medium", "high"],
    },
    // Основной цвет цветения (#RRGGBB) — им канвас подсвечивает объект в
    // месяце цветения (задача 6) и его анализирует советник по сочетаниям.
    { name: "primary_color", type: "text", required: false, max: 9 },
    { name: "height_cm", type: "number", required: false, min: 0, max: 5000 },
    // catalogId несовместимых соседей (не relation: справочные записи у
    // каждого пользователя свои, стабилен между ними только catalogId).
    { name: "incompatible_ids", type: "json", required: false, maxSize: 4000 },
    { name: "latin_name", type: "text", required: false, max: 200 },
  ];

  let changed = false;
  for (const spec of specs) {
    if (plants.fields.getByName(spec.name)) continue;
    plants.fields.add(new Field(spec));
    changed = true;
  }
  if (changed) app.save(plants);
}, (app) => {
  const plants = app.findCollectionByNameOrId("plants");
  const names = [
    "bloom_months", "sun_exposure", "soil_type", "moisture",
    "primary_color", "height_cm", "incompatible_ids", "latin_name",
  ];
  for (const name of names) {
    if (plants.fields.getByName(name)) plants.fields.removeByName(name);
  }
  app.save(plants);
});
