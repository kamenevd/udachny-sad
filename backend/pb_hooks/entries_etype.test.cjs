'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const {
  ALLOWED_ETYPES,
  BLOCKED_ETYPES,
  photosFromRecord,
  validateEntry,
} = require('./entries_etype.js')

describe('entries_etype policy', () => {
  it('разрешает только prune, replant, death, disease', () => {
    assert.deepEqual(ALLOWED_ETYPES, ['prune', 'replant', 'death', 'disease'])
  })

  it('блок-список совпадает с ТЗ', () => {
    assert.deepEqual(BLOCKED_ETYPES, ['water', 'bloom', 'harvest', 'feed', 'shelter', 'note'])
  })

  for (const etype of BLOCKED_ETYPES) {
    it(`blocked ${etype} →  поле etype`, () => {
      const err = validateEntry(etype, ['x.jpg'])
      assert.equal(err.field, 'etype')
      assert.equal(err.code, 'validation_blocked_etype')
    })
  }

  for (const etype of ['prune', 'replant', 'death']) {
    it(`allowed ${etype} без фото`, () => {
      assert.equal(validateEntry(etype, []), null)
    })
  }

  it('disease без фото → поле photos', () => {
    const err = validateEntry('disease', [])
    assert.equal(err.field, 'photos')
    assert.equal(err.code, 'validation_disease_photo_required')
  })

  it('disease с фото ок', () => {
    assert.equal(validateEntry('disease', ['leaf.jpg']), null)
  })

  it('photosFromRecord считает имена и unsaved', () => {
    assert.equal(
      photosFromRecord({
        getStringSlice: () => ['a.jpg'],
        getUnsavedFiles: () => [1],
      }),
      2,
    )
  })
})
