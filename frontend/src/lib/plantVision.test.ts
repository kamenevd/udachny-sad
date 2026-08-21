import { describe, expect, it } from 'vitest'
import type { Plant } from './types'
import { applyGuess, fetchPlantGuess, matchPlant, parsePlantGuess } from './plantVision'

function plant(name: string, ptype = 'perennial', extra: Partial<Plant> = {}): Plant {
  return {
    id: `id-${name}`,
    owner: 'u1',
    name,
    cultivar: '',
    ptype: ptype as Plant['ptype'],
    notes: '',
    photo: '',
    created: '',
    updated: '',
    ...extra,
  }
}

describe('parsePlantGuess: ответ модели → поля растения', () => {
  it('полный ответ разбирается в название, сорт и вид', () => {
    expect(
      parsePlantGuess({ known: true, name: 'Гортензия метельчатая', cultivar: 'Limelight', ptype: 'shrub' }),
    ).toEqual({ name: 'Гортензия метельчатая', cultivar: 'Limelight', ptype: 'shrub' })
  })

  it('обрезает пробелы и слишком длинные строки', () => {
    const g = parsePlantGuess({ name: '  Пион  ', cultivar: ' х'.repeat(200), ptype: 'perennial' })
    expect(g?.name).toBe('Пион')
    expect(g!.cultivar.length).toBeLessThanOrEqual(160)
  })

  it('неизвестный вид превращается в «многолетник»', () => {
    expect(parsePlantGuess({ name: 'Роза', ptype: 'cactus' })?.ptype).toBe('perennial')
    expect(parsePlantGuess({ name: 'Роза' })?.ptype).toBe('perennial')
  })

  it('«не узнали» и мусор дают null', () => {
    expect(parsePlantGuess({ known: false, name: 'Пион', ptype: 'perennial' })).toBeNull()
    expect(parsePlantGuess({ known: true, name: '', ptype: 'shrub' })).toBeNull()
    expect(parsePlantGuess({ known: true, ptype: 'shrub' })).toBeNull()
    expect(parsePlantGuess(null)).toBeNull()
    expect(parsePlantGuess('Пион')).toBeNull()
    expect(parsePlantGuess(42)).toBeNull()
  })
})

describe('matchPlant: похожее растение уже в списке', () => {
  const plants = [
    plant('Гортензия метельчатая', 'shrub'),
    plant('Пион', 'perennial'),
    plant('Роза плетистая', 'shrub'),
    plant('Капель', 'perennial'),
  ]

  it('точное совпадение, без оглядки на регистр и ё', () => {
    expect(matchPlant(plants, 'пион')?.name).toBe('Пион')
    expect(matchPlant([plant('Ёлка')], 'елка')?.name).toBe('Ёлка')
  })

  it('короткое название находит длинное: «Гортензия» → «Гортензия метельчатая»', () => {
    expect(matchPlant(plants, 'Гортензия')?.name).toBe('Гортензия метельчатая')
  })

  it('длинное название находит короткое: «Пион молочноцветковый» → «Пион»', () => {
    expect(matchPlant(plants, 'Пион молочноцветковый')?.name).toBe('Пион')
  })

  it('общий род по первому слову: «Роза морщинистая» → «Роза плетистая»', () => {
    expect(matchPlant(plants, 'Роза морщинистая')?.name).toBe('Роза плетистая')
  })

  it('не путает куски слов: «Ель» не находит «Капель»', () => {
    expect(matchPlant(plants, 'Ель')).toBeNull()
  })

  it('пустая догадка и чужие названия дают null', () => {
    expect(matchPlant(plants, '')).toBeNull()
    expect(matchPlant(plants, 'Клематис')).toBeNull()
  })
})

describe('applyGuess: лист посадки заполняется сам, печатать не нужно', () => {
  const plants = [plant('Гортензия метельчатая', 'shrub')]

  it('похожее растение уже есть — подставляем его, а не дубль', () => {
    const a = applyGuess(plants, { name: 'Гортензия', cultivar: '', ptype: 'shrub' })
    expect(a.picked?.name).toBe('Гортензия метельчатая')
    expect(a.name).toBe('Гортензия метельчатая')
  })

  it('нового растения нет в списке — поля заполнены догадкой, имя не пустое без печати', () => {
    const a = applyGuess(plants, { name: 'Хоста', cultivar: '', ptype: 'perennial' })
    expect(a.picked).toBeNull()
    expect(a.name).toBe('Хоста')
    expect(a.name.length).toBeGreaterThan(0)
    expect(a.ptype).toBe('perennial')
  })
})

describe('fetchPlantGuess: если распознавание сломалось, посадка не блокируется', () => {
  const img = 'data:image/jpeg;base64,AAAA'

  function fakeFetch(status: number, body: unknown): typeof fetch {
    return (async () =>
      new Response(JSON.stringify(body), { status })) as unknown as typeof fetch
  }

  it('удачный ответ сервера превращается в догадку', async () => {
    const guess = await fetchPlantGuess(img, 'tok', fakeFetch(200, {
      ok: true,
      plant: { known: true, name: 'Пион', cultivar: '', ptype: 'perennial' },
    }))
    expect(guess).toEqual({ name: 'Пион', cultivar: '', ptype: 'perennial' })
  })

  it('ошибка сервера → null', async () => {
    expect(await fetchPlantGuess(img, 'tok', fakeFetch(502, { ok: false }))).toBeNull()
  })

  it('сервер ответил «не вышло» → null', async () => {
    expect(await fetchPlantGuess(img, 'tok', fakeFetch(200, { ok: false, error: 'vision-failed' }))).toBeNull()
  })

  it('сеть упала → null, без исключений', async () => {
    const failing = (async () => {
      throw new Error('network down')
    }) as unknown as typeof fetch
    expect(await fetchPlantGuess(img, 'tok', failing)).toBeNull()
  })

  it('модель вернула «не узнали» → null', async () => {
    expect(
      await fetchPlantGuess(img, 'tok', fakeFetch(200, { ok: true, plant: { known: false } })),
    ).toBeNull()
  })
})
