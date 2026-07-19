/// <reference path="../pb_data/types.d.ts" />
/**
 * Задача A.3 — перенос схемы Convex (app/convex/schema.ts) в PocketBase.
 *
 * Соответствие таблиц Convex → коллекций PocketBase 1:1, с двумя отличиями,
 * продиктованными платформой:
 *  - `createdAt`/`updatedAt` не дублируются вручную — используются встроенные
 *    системные поля PocketBase `created`/`updated` (автозаполняются).
 *  - `photos.storageId` (Convex File Storage) заменён на нативное поле типа
 *    `file` — PocketBase хранит и отдаёт файлы сам (см. задачу C.6).
 *
 * Идемпотентность: миграция проверяет существование коллекции по имени
 * перед созданием и выходит рано, если она уже применена — можно запускать
 * `pocketbase migrate up` повторно без ошибок.
 */
migrate((app) => {
  if (app.findCollectionByNameOrId("gardens")) {
    return; // уже применено
  }

  const usersCollection = app.findCollectionByNameOrId("users");

  // users — расширяем встроенную auth-коллекцию бизнес-полями
  // (аналог users.role/locale в Convex; email/name/avatar уже есть у auth-коллекций).
  usersCollection.fields.add(new Field({
    name: "role",
    type: "select",
    required: false,
    maxSelect: 1,
    values: ["user", "admin"],
  }));
  usersCollection.fields.add(new Field({
    name: "locale",
    type: "text",
    required: false,
    max: 10,
  }));
  app.save(usersCollection);

  // gardens
  const gardens = new Collection({
    name: "gardens",
    type: "base",
    fields: [
      { name: "ownerId", type: "relation", required: true, collectionId: usersCollection.id, cascadeDelete: true, maxSelect: 1 },
      { name: "name", type: "text", required: true, max: 200 },
      { name: "description", type: "text", required: false, max: 5000 },
      { name: "boundary", type: "json", required: false, maxSize: 200000 },
      { name: "originGps", type: "json", required: false, maxSize: 1000 },
      { name: "canvasConfig", type: "json", required: false, maxSize: 1000 },
    ],
    indexes: [
      "CREATE INDEX idx_gardens_owner ON gardens (ownerId)",
    ],
    listRule: "ownerId = @request.auth.id",
    viewRule: "ownerId = @request.auth.id",
    createRule: "ownerId = @request.auth.id",
    updateRule: "ownerId = @request.auth.id",
    deleteRule: "ownerId = @request.auth.id",
  });
  app.save(gardens);

  // schemaObjects — building | greenhouse | lawn | path | bed | flowerbed | tree | shrub | water | gate | other
  const schemaObjects = new Collection({
    name: "schemaObjects",
    type: "base",
    fields: [
      { name: "gardenId", type: "relation", required: true, collectionId: gardens.id, cascadeDelete: true, maxSelect: 1 },
      {
        name: "type", type: "select", required: true, maxSelect: 1,
        values: ["building", "greenhouse", "lawn", "path", "bed", "flowerbed", "tree", "shrub", "water", "gate", "other"],
      },
      { name: "label", type: "text", required: false, max: 200 },
      { name: "geometry", type: "json", required: true, maxSize: 500000 },
      { name: "style", type: "json", required: false, maxSize: 2000 },
      { name: "sortOrder", type: "number", required: false },
    ],
    indexes: [
      "CREATE INDEX idx_schemaObjects_garden ON schemaObjects (gardenId)",
      "CREATE INDEX idx_schemaObjects_garden_type ON schemaObjects (gardenId, type)",
    ],
    listRule: "gardenId.ownerId = @request.auth.id",
    viewRule: "gardenId.ownerId = @request.auth.id",
    createRule: "gardenId.ownerId = @request.auth.id",
    updateRule: "gardenId.ownerId = @request.auth.id",
    deleteRule: "gardenId.ownerId = @request.auth.id",
  });
  app.save(schemaObjects);

  // lightZones — condition: sunny | partial_shade | shade
  const lightZones = new Collection({
    name: "lightZones",
    type: "base",
    fields: [
      { name: "gardenId", type: "relation", required: true, collectionId: gardens.id, cascadeDelete: true, maxSelect: 1 },
      { name: "name", type: "text", required: false, max: 200 },
      { name: "geometry", type: "json", required: true, maxSize: 500000 },
      { name: "condition", type: "select", required: true, maxSelect: 1, values: ["sunny", "partial_shade", "shade"] },
      { name: "style", type: "json", required: false, maxSize: 2000 },
    ],
    indexes: [
      "CREATE INDEX idx_lightZones_garden ON lightZones (gardenId)",
    ],
    listRule: "gardenId.ownerId = @request.auth.id",
    viewRule: "gardenId.ownerId = @request.auth.id",
    createRule: "gardenId.ownerId = @request.auth.id",
    updateRule: "gardenId.ownerId = @request.auth.id",
    deleteRule: "gardenId.ownerId = @request.auth.id",
  });
  app.save(lightZones);

  // moistureZones — condition: dry | moderate | wet
  const moistureZones = new Collection({
    name: "moistureZones",
    type: "base",
    fields: [
      { name: "gardenId", type: "relation", required: true, collectionId: gardens.id, cascadeDelete: true, maxSelect: 1 },
      { name: "name", type: "text", required: false, max: 200 },
      { name: "geometry", type: "json", required: true, maxSize: 500000 },
      { name: "condition", type: "select", required: true, maxSelect: 1, values: ["dry", "moderate", "wet"] },
      { name: "style", type: "json", required: false, maxSize: 2000 },
    ],
    indexes: [
      "CREATE INDEX idx_moistureZones_garden ON moistureZones (gardenId)",
    ],
    listRule: "gardenId.ownerId = @request.auth.id",
    viewRule: "gardenId.ownerId = @request.auth.id",
    createRule: "gardenId.ownerId = @request.auth.id",
    updateRule: "gardenId.ownerId = @request.auth.id",
    deleteRule: "gardenId.ownerId = @request.auth.id",
  });
  app.save(moistureZones);

  // plants — пользовательский справочник растений
  const plants = new Collection({
    name: "plants",
    type: "base",
    fields: [
      { name: "userId", type: "relation", required: true, collectionId: usersCollection.id, cascadeDelete: true, maxSelect: 1 },
      { name: "plantType", type: "text", required: true, max: 100 },
      { name: "name", type: "text", required: true, max: 200 },
      { name: "variety", type: "text", required: false, max: 200 },
      { name: "description", type: "text", required: false, max: 5000 },
      { name: "catalogId", type: "text", required: false, max: 100 },
    ],
    indexes: [
      "CREATE INDEX idx_plants_user ON plants (userId)",
      "CREATE INDEX idx_plants_user_name ON plants (userId, name)",
    ],
    listRule: "userId = @request.auth.id",
    viewRule: "userId = @request.auth.id",
    createRule: "userId = @request.auth.id",
    updateRule: "userId = @request.auth.id",
    deleteRule: "userId = @request.auth.id",
  });
  app.save(plants);

  // plantings — status: active | dead | completed | relocated
  const plantings = new Collection({
    name: "plantings",
    type: "base",
    fields: [
      { name: "gardenId", type: "relation", required: true, collectionId: gardens.id, cascadeDelete: true, maxSelect: 1 },
      { name: "plantId", type: "relation", required: true, collectionId: plants.id, cascadeDelete: true, maxSelect: 1 },
      { name: "schemaObjectId", type: "relation", required: false, collectionId: schemaObjects.id, cascadeDelete: false, maxSelect: 1 },
      { name: "positionNote", type: "text", required: false, max: 500 },
      { name: "plantedAt", type: "date", required: true },
      { name: "status", type: "select", required: true, maxSelect: 1, values: ["active", "dead", "completed", "relocated"] },
      { name: "endedAt", type: "date", required: false },
      // relocatedToPlantingId — само-ссылка; collectionId проставляется ниже после app.save,
      // когда у коллекции уже есть свой id (нельзя сослаться на себя до создания).
      { name: "quantity", type: "number", required: false },
      { name: "notes", type: "text", required: false, max: 5000 },
    ],
    indexes: [
      "CREATE INDEX idx_plantings_garden ON plantings (gardenId)",
      "CREATE INDEX idx_plantings_garden_status ON plantings (gardenId, status)",
      "CREATE INDEX idx_plantings_schemaObject_plantedAt ON plantings (schemaObjectId, plantedAt)",
      "CREATE INDEX idx_plantings_plant ON plantings (plantId)",
    ],
    listRule: "gardenId.ownerId = @request.auth.id",
    viewRule: "gardenId.ownerId = @request.auth.id",
    createRule: "gardenId.ownerId = @request.auth.id",
    updateRule: "gardenId.ownerId = @request.auth.id",
    deleteRule: "gardenId.ownerId = @request.auth.id",
  });
  app.save(plantings);

  // Само-ссылка relocatedToPlantingId — добавляется вторым save, теперь plantings.id известен.
  plantings.fields.add(new Field({
    name: "relocatedToPlantingId", type: "relation", required: false,
    collectionId: plantings.id, cascadeDelete: false, maxSelect: 1,
  }));
  app.save(plantings);

  // journalEvents — 12 типов событий (§2.8 ARCHITECTURE)
  const journalEvents = new Collection({
    name: "journalEvents",
    type: "base",
    fields: [
      { name: "plantingId", type: "relation", required: true, collectionId: plantings.id, cascadeDelete: true, maxSelect: 1 },
      {
        name: "eventType", type: "select", required: true, maxSelect: 1,
        values: ["planting", "watering", "blooming", "fruiting", "harvest", "pruning", "disease", "pest", "fertilizing", "transplant", "death", "other"],
      },
      { name: "eventDate", type: "date", required: true },
      { name: "title", type: "text", required: false, max: 200 },
      { name: "description", type: "text", required: false, max: 5000 },
      { name: "metadata", type: "json", required: false, maxSize: 5000 },
    ],
    indexes: [
      "CREATE INDEX idx_journalEvents_planting_date ON journalEvents (plantingId, eventDate)",
      "CREATE INDEX idx_journalEvents_planting_type ON journalEvents (plantingId, eventType)",
    ],
    listRule: "plantingId.gardenId.ownerId = @request.auth.id",
    viewRule: "plantingId.gardenId.ownerId = @request.auth.id",
    createRule: "plantingId.gardenId.ownerId = @request.auth.id",
    updateRule: "plantingId.gardenId.ownerId = @request.auth.id",
    deleteRule: "plantingId.gardenId.ownerId = @request.auth.id",
  });
  app.save(journalEvents);

  // photos — полиморфный владелец (planting | journalEvent | schemaObject),
  // поэтому ownerId — обычный text (id владельца), не relation.
  // Файл хранится нативно PocketBase (задача C.6) вместо Convex storageId.
  const photos = new Collection({
    name: "photos",
    type: "base",
    fields: [
      { name: "ownerType", type: "select", required: true, maxSelect: 1, values: ["planting", "journalEvent", "schemaObject"] },
      { name: "ownerId", type: "text", required: true, max: 50 },
      { name: "file", type: "file", required: true, maxSelect: 1, maxSize: 20971520, mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"] },
      { name: "caption", type: "text", required: false, max: 500 },
      { name: "width", type: "number", required: false },
      { name: "height", type: "number", required: false },
      { name: "fileSize", type: "number", required: false },
    ],
    indexes: [
      "CREATE INDEX idx_photos_owner ON photos (ownerType, ownerId)",
    ],
    // Полиморфная связь не проверяется decl.-рулом на уровне БД (нет FK на
    // конкретную коллекцию) — владение проверяется в API rule через подзапрос
    // по каждому из трёх возможных типов владельца (задача A.4 уточняет это
    // подробнее; здесь — рабочий вариант, покрывающий все три случая).
    listRule: "@request.auth.id != '' && (" +
      "(ownerType = 'schemaObject' && @collection.schemaObjects.id = ownerId && @collection.schemaObjects.gardenId.ownerId = @request.auth.id) || " +
      "(ownerType = 'planting' && @collection.plantings.id = ownerId && @collection.plantings.gardenId.ownerId = @request.auth.id) || " +
      "(ownerType = 'journalEvent' && @collection.journalEvents.id = ownerId && @collection.journalEvents.plantingId.gardenId.ownerId = @request.auth.id)" +
      ")",
    viewRule: null,
    createRule: null,
    updateRule: null,
    deleteRule: null,
  });
  photos.viewRule = photos.listRule;
  photos.createRule = photos.listRule;
  photos.updateRule = photos.listRule;
  photos.deleteRule = photos.listRule;
  app.save(photos);
}, (app) => {
  // down — обратный порядок из-за FK-зависимостей
  for (const name of ["photos", "journalEvents", "plantings", "plants", "moistureZones", "lightZones", "schemaObjects", "gardens"]) {
    const c = app.findCollectionByNameOrId(name);
    if (c) app.delete(c);
  }
  const usersCollection = app.findCollectionByNameOrId("users");
  if (usersCollection) {
    for (const fieldName of ["role", "locale"]) {
      const f = usersCollection.fields.getByName(fieldName);
      if (f) usersCollection.fields.removeByName(fieldName);
    }
    app.save(usersCollection);
  }
});
