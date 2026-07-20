/// <reference path="../pb_data/types.d.ts" />
/**
 * PLAN12 задача 1 — характеристики декоративных растений в коллекции `plants`.
 *
 * Календарь цветения (задача 3-6), мастер подбора (задача 8) и AI-советник
 * (задача 10) читают именно эти поля. Все они необязательные — растения,
 * заведённые пользователем вручную до PLAN12, остаются валидными.
 *
 * Идемпотентность: как и 003, миграция выходит рано, если поля уже добавлены.
 */
migrate((app) => {
  const plants = app.findCollectionByNameOrId("plants");
  if (plants.fields.getByName("bloom_months")) {
    return; // уже применено
  }

  // Месяцы цветения — json-массив номеров 1-12; пусто у хвойных.
  plants.fields.add(new Field({
    name: "bloom_months",
    type: "json",
    required: false,
    maxSize: 200,
  }));

  plants.fields.add(new Field({
    name: "sun_exposure",
    type: "select",
    required: false,
    maxSelect: 1,
    values: ["full_sun", "partial_shade", "full_shade"],
  }));

  plants.fields.add(new Field({
    name: "soil_type",
    type: "select",
    required: false,
    maxSelect: 1,
    values: ["sandy", "loamy", "clay", "any"],
  }));

  plants.fields.add(new Field({
    name: "moisture",
    type: "select",
    required: false,
    maxSelect: 1,
    values: ["low", "medium", "high"],
  }));

  // Основной цвет цветения (#RRGGBB) — им канвас подсвечивает объект в
  // месяце цветения (задача 6) и его анализирует советник по сочетаниям.
  plants.fields.add(new Field({
    name: "primary_color",
    type: "text",
    required: false,
    max: 9,
  }));

  plants.fields.add(new Field({
    name: "height_cm",
    type: "number",
    required: false,
    min: 0,
    max: 5000,
  }));

  // catalogId несовместимых соседей (не relation: справочные записи у каждого
  // пользователя свои, стабилен между ними только catalogId).
  plants.fields.add(new Field({
    name: "incompatible_ids",
    type: "json",
    required: false,
    maxSize: 4000,
  }));

  plants.fields.add(new Field({
    name: "latin_name",
    type: "text",
    required: false,
    max: 200,
  }));

  app.save(plants);
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
