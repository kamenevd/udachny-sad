/// <reference path="../pb_data/types.d.ts" />
/**
 * MVP журнала: API entries принимает только prune / replant / death / disease.
 * Вырезанные типы (water, bloom, harvest, feed, shelter, note) — 400 на поле etype.
 * disease — только с хотя бы одним фото.
 *
 * Хуки только валидируют create/update. Старые записи не удаляем и не мигрируем.
 * Правила доступа коллекции (владелец / члены семьи) не меняем.
 *
 * require() — внутри handler: JSVM сериализует каждый handler отдельно
 * и не видит переменные с верхнего уровня файла.
 */
onRecordValidate((e) => {
  var policy = require(__hooks + '/entries_etype.js')
  var etype = e.record.getString('etype')
  var err = policy.validateEntry(etype, policy.photosFromRecord(e.record))
  if (err) {
    var data = {}
    data[err.field] = new ValidationError(err.code, err.message)
    throw new BadRequestError(err.message, data)
  }
  e.next()
}, 'entries')
