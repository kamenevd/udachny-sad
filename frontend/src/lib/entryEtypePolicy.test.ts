import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { BLOCKED_ENTRY_TYPES, MVP_ENTRY_TYPES } from './catalog'

const require = createRequire(import.meta.url)
const policy = require(join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../backend/pb_hooks/entries_etype.js',
)) as {
  ALLOWED_ETYPES: string[]
  BLOCKED_ETYPES: string[]
  photoCount: (photos: unknown) => number
  photosFromRecord: (record: unknown) => number
  validateEntry: (
    etype: string,
    photos: unknown,
  ) => null | { field: string; code: string; message: string }
}

describe('серверный контракт etype (entries)', () => {
  it('каталог и хук держат один список разрешённых и вырезанных типов', () => {
    expect(policy.ALLOWED_ETYPES).toEqual([...MVP_ENTRY_TYPES])
    expect(policy.BLOCKED_ETYPES).toEqual([...BLOCKED_ENTRY_TYPES])
  })

  it.each([...BLOCKED_ENTRY_TYPES])('blocked %s → ошибка на поле etype', (etype) => {
    const err = policy.validateEntry(etype, ['already.jpg'])
    expect(err).not.toBeNull()
    expect(err!.field).toBe('etype')
    expect(err!.code).toBe('validation_blocked_etype')
    expect(err!.message).toMatch(/больше не принимается/)
  })

  it.each(['prune', 'replant', 'death'] as const)('allowed %s проходит без фото', (etype) => {
    expect(policy.validateEntry(etype, [])).toBeNull()
    expect(policy.validateEntry(etype, null)).toBeNull()
  })

  it('disease без фото → ошибка на поле photos', () => {
    const err = policy.validateEntry('disease', [])
    expect(err).not.toBeNull()
    expect(err!.field).toBe('photos')
    expect(err!.code).toBe('validation_disease_photo_required')
    expect(err!.message).toMatch(/фото/)
  })

  it('disease с фото проходит', () => {
    expect(policy.validateEntry('disease', ['leaf.jpg'])).toBeNull()
    expect(policy.validateEntry('disease', 1)).toBeNull()
  })

  it('неизвестный etype режется так же, как вырезанные', () => {
    const err = policy.validateEntry('planted', [])
    expect(err?.field).toBe('etype')
  })

  it('photosFromRecord считает имена и несохранённые файлы', () => {
    expect(
      policy.photosFromRecord({
        getStringSlice: () => ['a.jpg', ''],
        getUnsavedFiles: () => [{ name: 'b.jpg' }],
      }),
    ).toBe(2)
    expect(policy.photosFromRecord({ get: () => [] })).toBe(0)
  })
})
