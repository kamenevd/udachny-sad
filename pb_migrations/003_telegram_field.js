/// <reference path="../pb_data/types.d.ts" />
/**
 * Задача B — поле для входа через Telegram Login Widget.
 *
 * Telegram — не OAuth2-провайдер (в отличие от Яндекса), поэтому в
 * users нет автоматической записи через встроенный механизм PocketBase
 * external-auths. Вместо этого pb_hooks/telegram_auth.pb.js ищет/создаёт
 * запись пользователя по этому полю (задача B.3/B.4).
 */
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  if (users.fields.getByName("telegramId")) {
    return; // уже применено
  }

  users.fields.add(new Field({
    name: "telegramId",
    type: "text",
    required: false,
    max: 32,
  }));
  users.indexes.push("CREATE UNIQUE INDEX idx_users_telegramId ON users (telegramId) WHERE telegramId != ''");
  app.save(users);
}, (app) => {
  const users = app.findCollectionByNameOrId("users");
  const f = users.fields.getByName("telegramId");
  if (f) {
    users.fields.removeByName("telegramId");
    users.indexes = users.indexes.filter((i) => !i.includes("idx_users_telegramId"));
    app.save(users);
  }
});
