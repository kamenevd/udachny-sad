import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  MIN_STARTUP_PHOTOS,
  STARTUP_POINTS,
  buildPointsFallback,
  canDrawStartup,
  mapVisionToFeatures,
  nextStartupPoint,
  requiredStartupPoints,
  startupWalkDone,
} from './startupSchema'
import { shapeBounds } from './geometry'

const W = 24
const H = 18

describe('точки съёмки', () => {
  it('пять обязательных точек прогулки', () => {
    const required = requiredStartupPoints()
    expect(required.map((p) => p.id)).toEqual(['gate', 'house', 'far-left', 'far-right', 'path'])
  })

  it('точки внутри участка, с подписями и без повторов', () => {
    const ids = new Set(STARTUP_POINTS.map((p) => p.id))
    expect(ids.size).toBe(STARTUP_POINTS.length)
    for (const p of STARTUP_POINTS) {
      expect(p.label.length).toBeGreaterThan(0)
      expect(p.hint.length).toBeGreaterThan(0)
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(1)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(1)
    }
  })

  it('дополнительные точки не обязательны', () => {
    const optional = STARTUP_POINTS.filter((p) => !p.required)
    expect(optional.length).toBeGreaterThan(0)
  })
})

describe('пропуск точек и минимум фото', () => {
  const required = requiredStartupPoints().map((p) => p.id)

  it('рисовать можно от трёх снимков', () => {
    expect(MIN_STARTUP_PHOTOS).toBe(3)
    expect(canDrawStartup(2)).toBe(false)
    expect(canDrawStartup(3)).toBe(true)
    expect(canDrawStartup(7)).toBe(true)
  })

  it('прогулка закончена, когда каждая обязательная точка снята или пропущена', () => {
    expect(startupWalkDone(required, [])).toBe(true)
    expect(startupWalkDone(required.slice(0, 3), required.slice(3))).toBe(true)
    expect(startupWalkDone(required.slice(0, 4), [])).toBe(false)
    expect(startupWalkDone([], [])).toBe(false)
  })

  it('следующая точка — первая необработанная обязательная', () => {
    expect(nextStartupPoint([], [])?.id).toBe('gate')
    expect(nextStartupPoint(['gate'], [])?.id).toBe('house')
    expect(nextStartupPoint(['gate'], ['house'])?.id).toBe('far-left')
    expect(nextStartupPoint(required, [])).toBeNull()
    // Дополнительные точки очередь не держат.
    expect(nextStartupPoint(required.slice(0, 3), required.slice(3))).toBeNull()
  })
})

describe('mapVisionToFeatures: ответ модели → объекты плана', () => {
  it('раскладывает дом, дорожки, клумбы, деревья и контур в метры участка', () => {
    const drafts = mapVisionToFeatures(
      {
        outline: [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
        ],
        house: { cx: 0.5, cy: 0.75, w: 0.3, h: 0.2, angle: 0 },
        paths: [{ points: [[0.5, 0.9], [0.5, 0.4]], width: 0.04 }],
        beds: [{ cx: 0.2, cy: 0.3, rx: 0.1, ry: 0.08 }],
        trees: [{ cx: 0.8, cy: 0.2, r: 0.05 }],
        water: [],
        buildings: [],
      },
      W,
      H,
    )

    const byKind = drafts.reduce<Record<string, number>>((acc, d) => {
      acc[d.kind] = (acc[d.kind] ?? 0) + 1
      return acc
    }, {})
    expect(byKind).toEqual({ lawn: 1, house: 1, path: 1, bed: 1, tree: 1 })

    const house = drafts.find((d) => d.kind === 'house')!
    expect(house.shape.t).toBe('rect')
    if (house.shape.t === 'rect') {
      expect(house.shape.w).toBeCloseTo(7.2, 1)
      expect(house.shape.h).toBeCloseTo(3.6, 1)
    }

    const path = drafts.find((d) => d.kind === 'path')!
    expect(path.shape.t).toBe('line')
    if (path.shape.t === 'line') {
      expect(path.shape.pts[0]).toEqual([12, 16.2])
      expect(path.shape.pts[1]).toEqual([12, 7.2])
    }

    // Всё в пределах участка.
    for (const d of drafts) {
      const b = shapeBounds(d.shape)
      expect(b.x).toBeGreaterThanOrEqual(-0.01)
      expect(b.y).toBeGreaterThanOrEqual(-0.01)
      expect(b.x + b.w).toBeLessThanOrEqual(W + 1.5)
      expect(b.y + b.h).toBeLessThanOrEqual(H + 1.5)
    }
  })

  it('понимает координаты в метрах', () => {
    const drafts = mapVisionToFeatures(
      { house: { cx: 12, cy: 13, w: 7, h: 4 }, trees: [{ cx: 20, cy: 3, r: 1.5 }] },
      W,
      H,
    )
    const house = drafts.find((d) => d.kind === 'house')!
    if (house.shape.t === 'rect') {
      expect(house.shape.x).toBeCloseTo(8.5, 1)
      expect(house.shape.w).toBeCloseTo(7, 1)
    }
    const tree = drafts.find((d) => d.kind === 'tree')!
    if (tree.shape.t === 'circle') {
      expect(tree.shape.cx).toBeCloseTo(20, 1)
      expect(tree.shape.r).toBeCloseTo(1.5, 1)
    }
  })

  it('мусор даёт пустой список, битые куски пропускаются', () => {
    expect(mapVisionToFeatures(null, W, H)).toEqual([])
    expect(mapVisionToFeatures('ерунда', W, H)).toEqual([])
    expect(mapVisionToFeatures([1, 2], W, H)).toEqual([])
    expect(mapVisionToFeatures({}, W, H)).toEqual([])

    const drafts = mapVisionToFeatures(
      {
        house: { cx: 'дом' },
        trees: [{ cx: 0.5, cy: 0.5 }, { cx: 'x' }, null, 42],
        paths: [{ points: [[0.1, 0.1]] }],
        outline: [[0, 0], [1, 0]],
      },
      W,
      H,
    )
    // Один валидный объект — дерево без радиуса (радиус по умолчанию).
    expect(drafts.length).toBe(1)
    expect(drafts[0].kind).toBe('tree')
  })
})

describe('buildPointsFallback: черновик без распознавания', () => {
  const allIds = STARTUP_POINTS.map((p) => p.id)

  it('рисует контур, дом у своей точки и дорожку от калитки', () => {
    const drafts = buildPointsFallback(allIds, W, H)
    const kinds = drafts.map((d) => d.kind)
    expect(kinds).toContain('lawn')
    expect(kinds).toContain('house')
    expect(kinds).toContain('path')

    for (const d of drafts) {
      const b = shapeBounds(d.shape)
      expect(b.x).toBeGreaterThanOrEqual(-0.5)
      expect(b.y).toBeGreaterThanOrEqual(-0.5)
      expect(b.x + b.w).toBeLessThanOrEqual(W + 0.5)
      expect(b.y + b.h).toBeLessThanOrEqual(H + 0.5)
    }

    const path = drafts.find((d) => d.kind === 'path')!
    if (path.shape.t === 'line') {
      // От калитки (низ) к середине дорожки.
      expect(path.shape.pts[0][1]).toBeGreaterThan(path.shape.pts[1][1])
    }
  })

  it('без точки дома дом не выдумывает', () => {
    const drafts = buildPointsFallback(['gate', 'far-left', 'far-right'], W, H)
    expect(drafts.some((d) => d.kind === 'house')).toBe(false)
    expect(drafts.some((d) => d.kind === 'path')).toBe(true)
  })

  it('совсем без нужных точек — хотя бы контур', () => {
    const drafts = buildPointsFallback(['far-left'], W, H)
    expect(drafts.length).toBe(1)
    expect(drafts[0].kind).toBe('lawn')
  })
})

describe('StartupSchemaSheet: никаких вопросов про фото', () => {
  const src = readFileSync(new URL('../plan/StartupSchemaSheet.tsx', import.meta.url), 'utf8')

  it('нет выпадающих списков и анкеты про дом/объект/место/размер', () => {
    expect(src).not.toMatch(/<select/i)
    expect(src).not.toMatch(/Где дом/i)
    expect(src).not.toMatch(/лучше всего видно/i)
    expect(src).not.toMatch(/Насколько объект/i)
    expect(src).not.toMatch(/StartupHouseHint|StartupFocus|StartupAreaHint|StartupSizeHint|StartupPhotoPrompt/)
  })

  it('есть съёмка по точкам и кнопка «Готово, рисуй»', () => {
    expect(src).toMatch(/Снять/)
    expect(src).toMatch(/Готово, рисуй/)
    expect(src).toMatch(/пропустить/i)
    expect(src).toMatch(/STARTUP_POINTS/)
  })
})
