/// <reference path="../pb_data/types.d.ts" />
/**
 * Реконсилиация живого сервера (pb.kdnfx.space) со схемой репозитория.
 *
 * Живой PocketBase настраивался вручную (июль 2026, до PLAN11/12) и разошёлся
 * с pb_migrations. Аудит 2026-08-20 через публичный API показал:
 *
 *  1. plants — легаси-поля: ownerId/species/notes вместо userId/latin_name/
 *     variety; нет plantType/description/catalogId и трейтов PLAN12.
 *  2. plantings и journalEvents — createRule не задан («Only superusers can
 *     perform this action»): пользователи вообще не могут вести журнал.
 *  3. users — нет role/locale (001 выходит рано, т.к. gardens уже существует).
 *  4. Списки select-значений могли не включать канонический набор.
 *
 * Миграция идемпотентна и сходится из любого состояния:
 *  - на свежей базе (001 создал всё правильно) — no-op по полям, повторная
 *    установка тех же правил;
 *  - на легаси-базе — переименования с сохранением данных, добавление
 *    недостающих полей, восстановление owner-scoped правил.
 *
 * Файл назван 003b, чтобы выполниться ДО 004 (трейты) и 005 (seed): обе
 * рассчитывают на канонические имена полей plants.
 */

function findCollectionOrNull(app, name) {
  try {
    return app.findCollectionByNameOrId(name);
  } catch {
    return null;
  }
}

/** Переименовать поле с сохранением данных (PocketBase отслеживает поле по id). */
function renameField(collection, from, to) {
  const f = collection.fields.getByName(from);
  if (!f || collection.fields.getByName(to)) return false;
  f.name = to;
  return true;
}

/** Добавить поле, если его ещё нет. */
function ensureField(collection, spec) {
  if (collection.fields.getByName(spec.name)) return false;
  collection.fields.add(new Field(spec));
  return true;
}

/**
 * created/updated — autodate-поля. В PocketBase 0.23+ они не появляются
 * сами у программно созданных коллекций, а фронт сортирует по `-created`
 * (400 без поля). У созданных вручную коллекций живого сервера могут
 * существовать частично — добавляем недостающие.
 */
function ensureTimestamps(collection) {
  ensureField(collection, { name: "created", type: "autodate", onCreate: true, onUpdate: false });
  ensureField(collection, { name: "updated", type: "autodate", onCreate: true, onUpdate: true });
}

/** Дополнить values select-поля недостающими каноническими значениями. */
function ensureSelectValues(collection, fieldName, values) {
  const f = collection.fields.getByName(fieldName);
  if (!f) return;
  for (const v of values) {
    if (!f.values.includes(v)) f.values.push(v);
  }
}

/** Владельческие правила: chain — путь от записи до ownerId владельца. */
function setOwnerRules(collection, chain) {
  const rule = chain + " = @request.auth.id";
  collection.listRule = rule;
  collection.viewRule = rule;
  collection.createRule = rule;
  collection.updateRule = rule;
  collection.deleteRule = rule;
}

/** Род из латинского названия → тип растения (для легаси-записей без plantType). */
function inferPlantType(latinName) {
  const genus = (latinName || "").split(" ")[0].toLowerCase();
  const byGenus = {
    malus: "tree",       // яблоня
    pyrus: "tree",       // груша
    prunus: "tree",      // вишня/слива
    fragaria: "perennial", // клубника
    rosa: "rose",
    thuja: "conifer",
    picea: "conifer",
    pinus: "conifer",
    juniperus: "conifer",
  };
  return byGenus[genus] ?? "perennial";
}

migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  const gardens = findCollectionOrNull(app, "gardens");
  if (!gardens) {
    // База пустая — 001 ещё не выполнялась (не должен случиться: порядок
    // файлов гарантирует 001 раньше), делать нечего.
    return;
  }

  // ── users: бизнес-поля, которые 001 добавляет только на свежей базе ──
  let usersChanged = ensureField(users, {
    name: "role", type: "select", required: false, maxSelect: 1,
    values: ["user", "admin"],
  });
  usersChanged = ensureField(users, {
    name: "locale", type: "text", required: false, max: 10,
  }) || usersChanged;
  if (usersChanged) app.save(users);

  // ── plants: легаси-переименования + недостающие базовые поля ──
  const plants = findCollectionOrNull(app, "plants");
  if (plants) {
    const wasLegacy = !!plants.fields.getByName("species");
    renameField(plants, "ownerId", "userId");
    renameField(plants, "species", "latin_name");
    renameField(plants, "notes", "variety");
    // Строки индексов ссылаются на колонки по имени — после переименования
    // пересборка таблицы упадёт, если не переписать их синхронно.
    plants.indexes = plants.indexes.map((idx) =>
      idx
        .replace(/\bownerId\b/g, "userId")
        .replace(/\bspecies\b/g, "latin_name")
        .replace(/\bnotes\b/g, "variety"),
    );
    if (!plants.fields.getByName("userId")) {
      ensureField(plants, {
        name: "userId", type: "relation", required: true,
        collectionId: users.id, cascadeDelete: true, maxSelect: 1,
      });
    }
    // required:false на время бэкфилла — у легаси-записей значения ещё нет.
    ensureField(plants, { name: "plantType", type: "text", required: false, max: 100 });
    ensureField(plants, { name: "variety", type: "text", required: false, max: 200 });
    ensureField(plants, { name: "latin_name", type: "text", required: false, max: 200 });
    ensureField(plants, { name: "description", type: "text", required: false, max: 5000 });
    ensureField(plants, { name: "catalogId", type: "text", required: false, max: 100 });
    ensureTimestamps(plants);
    setOwnerRules(plants, "userId");
    app.save(plants);

    if (wasLegacy) {
      for (const record of app.findAllRecords("plants")) {
        if (!record.getString("plantType")) {
          record.set("plantType", inferPlantType(record.getString("latin_name")));
          app.save(record);
        }
      }
    }
  }

  // ── plantings: недостающие поля + правила (на живом createRule не было) ──
  const plantings = findCollectionOrNull(app, "plantings");
  const schemaObjects = findCollectionOrNull(app, "schemaObjects");
  if (plantings && plants) {
    ensureField(plantings, {
      name: "gardenId", type: "relation", required: true,
      collectionId: gardens.id, cascadeDelete: true, maxSelect: 1,
    });
    ensureField(plantings, {
      name: "plantId", type: "relation", required: true,
      collectionId: plants.id, cascadeDelete: true, maxSelect: 1,
    });
    if (schemaObjects) {
      ensureField(plantings, {
        name: "schemaObjectId", type: "relation", required: false,
        collectionId: schemaObjects.id, cascadeDelete: false, maxSelect: 1,
      });
    }
    ensureField(plantings, { name: "positionNote", type: "text", required: false, max: 500 });
    ensureField(plantings, { name: "plantedAt", type: "date", required: true });
    ensureField(plantings, {
      name: "status", type: "select", required: true, maxSelect: 1,
      values: ["active", "dead", "completed", "relocated"],
    });
    ensureSelectValues(plantings, "status", ["active", "dead", "completed", "relocated"]);
    ensureField(plantings, { name: "endedAt", type: "date", required: false });
    ensureField(plantings, {
      name: "relocatedToPlantingId", type: "relation", required: false,
      collectionId: plantings.id, cascadeDelete: false, maxSelect: 1,
    });
    ensureField(plantings, { name: "quantity", type: "number", required: false });
    ensureField(plantings, { name: "notes", type: "text", required: false, max: 5000 });
    ensureTimestamps(plantings);
    setOwnerRules(plantings, "gardenId.ownerId");
    app.save(plantings);
  }

  // ── journalEvents: недостающие поля + правила ──
  const journalEvents = findCollectionOrNull(app, "journalEvents");
  if (journalEvents && plantings) {
    ensureField(journalEvents, {
      name: "plantingId", type: "relation", required: true,
      collectionId: plantings.id, cascadeDelete: true, maxSelect: 1,
    });
    ensureField(journalEvents, {
      name: "eventType", type: "select", required: true, maxSelect: 1,
      values: ["planting", "watering", "blooming", "fruiting", "harvest", "pruning", "disease", "pest", "fertilizing", "transplant", "death", "other"],
    });
    ensureSelectValues(journalEvents, "eventType", [
      "planting", "watering", "blooming", "pruning", "disease",
      "pest", "fertilizing", "transplant", "death", "other",
    ]);
    ensureField(journalEvents, { name: "eventDate", type: "date", required: true });
    ensureField(journalEvents, { name: "title", type: "text", required: false, max: 200 });
    ensureField(journalEvents, { name: "description", type: "text", required: false, max: 5000 });
    ensureField(journalEvents, { name: "metadata", type: "json", required: false, maxSize: 5000 });
    ensureTimestamps(journalEvents);
    setOwnerRules(journalEvents, "plantingId.gardenId.ownerId");
    app.save(journalEvents);
  }

  // ── schemaObjects / зоны: канонические значения select + правила ──
  if (schemaObjects) {
    ensureSelectValues(schemaObjects, "type", [
      "building", "lawn", "path", "flowerbed", "tree", "shrub",
      "water", "gate", "other",
    ]);
    ensureTimestamps(schemaObjects);
    setOwnerRules(schemaObjects, "gardenId.ownerId");
    app.save(schemaObjects);
  }
  for (const zoneName of ["lightZones", "moistureZones"]) {
    const zones = findCollectionOrNull(app, zoneName);
    if (!zones) continue;
    ensureSelectValues(
      zones,
      "condition",
      zoneName === "lightZones"
        ? ["sunny", "partial_shade", "shade"]
        : ["dry", "moderate", "wet"],
    );
    ensureTimestamps(zones);
    setOwnerRules(zones, "gardenId.ownerId");
    app.save(zones);
  }

  // ── gardens: правила (поля на живом уже совпадают с 001) ──
  ensureTimestamps(gardens);
  setOwnerRules(gardens, "ownerId");
  app.save(gardens);

  // ── photos: полиморфный владелец — правила как в 001 ──
  const photos = findCollectionOrNull(app, "photos");
  if (photos) {
    ensureField(photos, {
      name: "ownerType", type: "select", required: true, maxSelect: 1,
      values: ["planting", "journalEvent", "schemaObject"],
    });
    ensureSelectValues(photos, "ownerType", ["planting", "journalEvent", "schemaObject"]);
    ensureField(photos, { name: "ownerId", type: "text", required: true, max: 50 });
    ensureField(photos, {
      name: "file", type: "file", required: true, maxSelect: 1,
      maxSize: 20971520,
      mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"],
    });
    ensureField(photos, { name: "caption", type: "text", required: false, max: 500 });
    ensureField(photos, { name: "width", type: "number", required: false });
    ensureField(photos, { name: "height", type: "number", required: false });
    ensureField(photos, { name: "fileSize", type: "number", required: false });
    const photosRule = "@request.auth.id != '' && (" +
      "(ownerType = 'schemaObject' && @collection.schemaObjects.id = ownerId && @collection.schemaObjects.gardenId.ownerId = @request.auth.id) || " +
      "(ownerType = 'planting' && @collection.plantings.id = ownerId && @collection.plantings.gardenId.ownerId = @request.auth.id) || " +
      "(ownerType = 'journalEvent' && @collection.journalEvents.id = ownerId && @collection.journalEvents.plantingId.gardenId.ownerId = @request.auth.id)" +
      ")";
    photos.listRule = photosRule;
    photos.viewRule = photosRule;
    photos.createRule = photosRule;
    photos.updateRule = photosRule;
    ensureTimestamps(photos);
    photos.deleteRule = photosRule;
    app.save(photos);
  }
}, () => {
  // Реконсилиация — конвергентная операция без осмысленного отката:
  // возвращать легаси-схему с ownerId/species некуда и незачем.
});
