/**
 * Политика типов журнала (коллекция entries).
 * Общий модуль для хука PocketBase (require внутри handler) и тестов.
 *
 * Старые записи с вырезанными типами не трогаем — только create/update.
 * «Посадили» — это создание planting, не etype.
 */
'use strict'

var ALLOWED_ETYPES = ['prune', 'replant', 'death', 'disease']
var BLOCKED_ETYPES = ['water', 'bloom', 'harvest', 'feed', 'shelter', 'note']

var BLOCKED_SET = {}
var ALLOWED_SET = {}
for (var i = 0; i < BLOCKED_ETYPES.length; i++) BLOCKED_SET[BLOCKED_ETYPES[i]] = true
for (var j = 0; j < ALLOWED_ETYPES.length; j++) ALLOWED_SET[ALLOWED_ETYPES[j]] = true

function photoCount(photos) {
  if (photos == null || photos === '') return 0
  if (typeof photos === 'number') return photos > 0 ? photos : 0
  if (typeof photos === 'string') return 1
  if (typeof photos.length === 'number') {
    var n = 0
    for (var k = 0; k < photos.length; k++) {
      if (photos[k]) n++
    }
    return n
  }
  return 0
}

/**
 * Число фото на записи PocketBase: уже лежащие имена + ещё не сохранённые файлы.
 */
function photosFromRecord(record) {
  if (!record) return 0
  var n = 0
  if (typeof record.getStringSlice === 'function') {
    n += photoCount(record.getStringSlice('photos'))
  } else if (typeof record.get === 'function') {
    n += photoCount(record.get('photos'))
  }
  if (typeof record.getUnsavedFiles === 'function') {
    try {
      n += photoCount(record.getUnsavedFiles('photos'))
    } catch (err) {
      // поле без новых файлов
    }
  }
  return n
}

/**
 * @returns {null|{field:string,code:string,message:string}}
 */
function validateEntry(etype, photos) {
  var type = etype == null ? '' : String(etype)
  if (BLOCKED_SET[type] || !ALLOWED_SET[type]) {
    return {
      field: 'etype',
      code: 'validation_blocked_etype',
      message:
        'Этот тип записи больше не принимается. Можно: подрезали (prune), пересадили (replant), погибло (death), обработали (disease).',
    }
  }
  if (type === 'disease' && photoCount(photos) < 1) {
    return {
      field: 'photos',
      code: 'validation_disease_photo_required',
      message: 'Для записи «обработали» нужно хотя бы одно фото.',
    }
  }
  return null
}

module.exports = {
  ALLOWED_ETYPES: ALLOWED_ETYPES,
  BLOCKED_ETYPES: BLOCKED_ETYPES,
  photoCount: photoCount,
  photosFromRecord: photosFromRecord,
  validateEntry: validateEntry,
}
