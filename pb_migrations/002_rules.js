/// <reference path="../pb_data/types.d.ts" />
/**
 * Задача A.4 — правила доступа (API rules), изоляция данных по владельцу.
 *
 * Для gardens/schemaObjects/lightZones/moistureZones/plants/plantings/
 * journalEvents/photos правила уже заданы при создании коллекций в
 * pb_migrations/001_init.js (owner = @request.auth.id, либо цепочка
 * relation-полей до gardenId.ownerId для связанных таблиц). Эта миграция
 * докручивает единственную коллекцию, которую 001_init.js не трогал по
 * правилам — встроенную auth-коллекцию `users`: пользователь должен видеть
 * и редактировать только свою запись.
 *
 * Идемпотентна: если правила уже выставлены как нужно, повторный прогон —
 * no-op (app.save на неизменённой записи безопасен).
 */
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");

  users.listRule = "id = @request.auth.id";
  users.viewRule = "id = @request.auth.id";
  users.updateRule = "id = @request.auth.id";
  users.deleteRule = "id = @request.auth.id";
  // createRule оставлен как есть: обычная регистрация email/пароль отключена
  // (см. Login.tsx / auth.ts — только Telegram и Яндекс), OAuth2-провайдеры
  // создают запись пользователя с системными правами в обход API rules.

  app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  users.listRule = null;
  users.viewRule = null;
  users.updateRule = null;
  users.deleteRule = null;
  app.save(users);
});
