import { describe, expect, it } from 'vitest'
import { buildStartupSchema, hasStartupSignals } from './startupSchema'

const BOUNDS = { width: 24, height: 18 }

describe('hasStartupSignals', () => {
  it('возвращает false без подсказок', () => {
    expect(
      hasStartupSignals([
        { house: 'none', focus: 'none', area: 'unknown', size: 'medium' },
        { house: 'none', focus: 'none', area: 'center', size: 'medium' },
      ]),
    ).toBe(false)
  })

  it('считает подсказкой дом или выбранный объект', () => {
    expect(hasStartupSignals([{ house: 'left', focus: 'none', area: 'unknown', size: 'medium' }])).toBe(true)
    expect(hasStartupSignals([{ house: 'none', focus: 'path', area: 'center', size: 'small' }])).toBe(true)
  })
})

describe('buildStartupSchema', () => {
  it('ставит дом по подсказке и не выходит за границы', () => {
    const features = buildStartupSchema({
      ...BOUNDS,
      outline: 'rect',
      photos: [
        { house: 'left', focus: 'none', area: 'unknown', size: 'medium' },
        { house: 'left', focus: 'none', area: 'unknown', size: 'large' },
      ],
    })
    const house = features.find((f) => f.kind === 'house')
    expect(house?.shape.t).toBe('rect')
    if (!house || house.shape.t !== 'rect') return
    expect(house.shape.x).toBeGreaterThanOrEqual(0)
    expect(house.shape.y).toBeGreaterThanOrEqual(0)
    expect(house.shape.x + house.shape.w).toBeLessThanOrEqual(BOUNDS.width)
    expect(house.shape.y + house.shape.h).toBeLessThanOrEqual(BOUNDS.height)
  })

  it('создаёт дорожку, клумбу и кластер деревьев', () => {
    const features = buildStartupSchema({
      ...BOUNDS,
      outline: 'rect',
      photos: [
        { house: 'none', focus: 'path', area: 'bottom', size: 'large' },
        { house: 'none', focus: 'bed', area: 'right', size: 'medium' },
        { house: 'none', focus: 'trees', area: 'top-left', size: 'large' },
      ],
    })

    const byKind = features.reduce<Record<string, number>>((acc, item) => {
      acc[item.kind] = (acc[item.kind] ?? 0) + 1
      return acc
    }, {})

    expect(byKind.path).toBe(1)
    expect(byKind.bed).toBe(1)
    expect(byKind.tree).toBe(3)
  })

  it('для Г-образного участка делает дорожку с изгибом', () => {
    const features = buildStartupSchema({
      ...BOUNDS,
      outline: 'l-shape',
      photos: [{ house: 'none', focus: 'path', area: 'center', size: 'large' }],
    })
    const path = features.find((f) => f.kind === 'path')
    expect(path?.shape.t).toBe('line')
    if (!path || path.shape.t !== 'line') return
    expect(path.shape.pts.length).toBe(3)
  })
})
