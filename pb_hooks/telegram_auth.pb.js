/// <reference path="../pb_data/types.d.ts" />
/**
 * Задача B.3/B.4 — вход через Telegram Login Widget.
 *
 * Telegram — НЕ OAuth2-провайдер (в отличие от Яндекса, который настраивается
 * штатно в PocketBase admin UI, Settings → Auth providers). Виджет Telegram
 * возвращает на фронтенд подписанный объект { id, first_name, last_name?,
 * username?, photo_url?, auth_date, hash }, который нужно проверить и обменять
 * на PocketBase auth-токен самим — отсюда этот кастомный роут.
 * Алгоритм проверки: https://core.telegram.org/widgets/login#checking-authorization
 *
 * ⚠️ ТРЕБУЕТ РУЧНОЙ ПРОВЕРКИ ПЕРЕД ДЕПЛОЕМ (нет доступа к живому PocketBase,
 * чтобы прогнать это через реальный JSVM):
 *  1. `$security.sha256(text)` / `$security.hs256(text, secret)` — сигнатуры
 *     взяты из PocketBase JSVM docs (pocketbase.io/docs/js-overview,
 *     tools/security bindings) по состоянию на момент написания. Ключевой
 *     риск: Telegram требует secret_key = RAW-байты SHA256(bot_token) как
 *     ключ HMAC (не hex-строка). Если `$security.hs256` интерпретирует
 *     второй аргумент как UTF-8 текст (а не произвольные байты), эта
 *     реализация даст неверный hash и все входы будут отклоняться как
 *     невалидные. Проверить на тестовом векторе из документации Telegram
 *     ПЕРЕД тем как полагаться на этот роут в проде.
 *  2. `record.newAuthToken()` — по конвенции PocketBase JSVM (Go PascalCase
 *     → JS camelCase), но метода `Record.NewAuthToken()` я не видел живьём
 *     в этой версии PocketBase. Если такого метода нет — см. официальный
 *     cookbook «Send custom auth response» (pocketbase.io/docs/js-sending-emails
 *     соседние статьи) для актуального способа выдать токен вручную;
 *     запасной вариант — переписать этот хук на Go-расширение
 *     (github.com/pocketbase/pocketbase как библиотека), где
 *     tools/security и выдача JWT — обычный, полностью документированный
 *     Go-код без риска несовпадения байтовой семантики.
 *  3. `routerAdd` / `e.requestInfo()` / `e.json()` — сигнатуры JSVM-роутера
 *     v0.23+ (RequestEvent). Сверить с `pocketbase.io/docs/js-routing`.
 *
 * Тест до продакшена: залогиниться через виджет на тестовом боте, свериться,
 * что `pb.authStore.isValid` истинный и `pb.authStore.model.telegramId`
 * совпадает с Telegram id.
 */

const TELEGRAM_AUTH_MAX_AGE_SECONDS = 24 * 60 * 60; // защита от replay

routerAdd("POST", "/api/telegram-auth", (e) => {
  const info = e.requestInfo();
  const data = info.body || {};

  const botToken = $os.getenv("TELEGRAM_BOT_TOKEN");
  if (!botToken) {
    throw new BadRequestError("TELEGRAM_BOT_TOKEN не настроен на сервере");
  }
  if (!data.hash || !data.id || !data.auth_date) {
    throw new BadRequestError("Неполные данные от Telegram Login Widget");
  }

  // data-check-string — все поля кроме hash, отсортированные по ключу,
  // "key=value" через \n (см. документацию Telegram).
  const checkFields = Object.keys(data)
    .filter((k) => k !== "hash")
    .sort()
    .map((k) => `${k}=${data[k]}`);
  const checkString = checkFields.join("\n");

  const secretKey = $security.sha256(botToken); // см. предупреждение (1) выше
  const expectedHash = $security.hs256(checkString, secretKey);

  if (expectedHash !== data.hash) {
    throw new ForbiddenError("Неверная подпись Telegram");
  }

  const authAge = Math.floor(Date.now() / 1000) - Number(data.auth_date);
  if (authAge > TELEGRAM_AUTH_MAX_AGE_SECONDS || authAge < 0) {
    throw new ForbiddenError("Данные Telegram-входа устарели");
  }

  const telegramId = String(data.id);
  const usersCollection = $app.findCollectionByNameOrId("users");

  let record;
  try {
    record = $app.findFirstRecordByFilter(usersCollection, "telegramId = {:telegramId}", { telegramId });
  } catch (err) {
    record = null; // не найден — создаём ниже
  }

  if (!record) {
    record = new Record(usersCollection);
    record.set("telegramId", telegramId);
    record.set("role", "user");
    record.set("locale", "ru");
    record.set("password", $security.randomString(30));
    record.set("verified", true);
  }

  const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ");
  if (fullName) record.set("name", fullName);
  if (data.username) record.set("username", data.username);

  $app.save(record);

  // Фото профиля не скачиваем и не сохраняем как file-поле здесь намеренно —
  // отдельная задача при необходимости (загрузка по URL с внешнего хоста
  // требует отдельной проверки безопасности/лимитов).

  const token = record.newAuthToken(); // см. предупреждение (2) выше

  return e.json(200, {
    token: token,
    record: record,
  });
});
