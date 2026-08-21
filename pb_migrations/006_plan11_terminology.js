/// <reference path="../pb_data/types.d.ts" />
/**
 * PLAN11 (декоративный сад) поменял словари фронтенда, но миграции под них
 * никто не написал — сервер отклонял значения 400-й ошибкой
 * (validation_invalid_value), обнаружено при прогоне против живого
 * PocketBase 0.29:
 *
 *  - schemaObjects.type: фронт (EditorToolbar OBJECT_TYPES, lib/pb.ts)
 *    рисует «композицию» и «изгородь» → добавляем composition, hedge.
 *  - journalEvents.eventType: фронт (EventForm EVENT_TYPES) ведёт «укрытие»
 *    → добавляем winterizing.
 *
 * Старые значения (greenhouse, bed, fruiting, harvest) НЕ удаляем: у живых
 * инсталляций могут остаться записи с ними, а select-поле с неизвестным
 * значением ломает и чтение. Фронт незнакомые типы показывает как «Другое».
 */
migrate((app) => {
  const schemaObjects = app.findCollectionByNameOrId("schemaObjects");
  const typeField = schemaObjects.fields.getByName("type");
  for (const value of ["composition", "hedge"]) {
    if (!typeField.values.includes(value)) typeField.values.push(value);
  }
  app.save(schemaObjects);

  const journalEvents = app.findCollectionByNameOrId("journalEvents");
  const eventTypeField = journalEvents.fields.getByName("eventType");
  if (!eventTypeField.values.includes("winterizing")) {
    eventTypeField.values.push("winterizing");
  }
  app.save(journalEvents);
}, (app) => {
  const schemaObjects = app.findCollectionByNameOrId("schemaObjects");
  const typeField = schemaObjects.fields.getByName("type");
  typeField.values = typeField.values.filter(
    (v) => v !== "composition" && v !== "hedge",
  );
  app.save(schemaObjects);

  const journalEvents = app.findCollectionByNameOrId("journalEvents");
  const eventTypeField = journalEvents.fields.getByName("eventType");
  eventTypeField.values = eventTypeField.values.filter(
    (v) => v !== "winterizing",
  );
  app.save(journalEvents);
});
