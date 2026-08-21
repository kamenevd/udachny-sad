import { describe, expect, it } from 'vitest'
import { buildWalkPoints, nearestGrowingPlanting } from './photoWalk'
import type { Planting } from './types'

const BOUNDS = { width: 20, height: 12 }

function planting(id: string, x: number, y: number, status: Planting['status'] = 'growing'): Planting {
  return {
    id,
    plot: 'plot',
    plant: `plant-${id}`,
    feature: '',
    x,
    y,
    planted_on: '2026-08-01',
    status,
    ended_on: '',
    end_note: '',
    created: '2026-08-01',
    updated: '2026-08-01',
  }
}

describe('buildWalkPoints', () => {
  it('даёт нужное число точек и сохраняет старт/финиш', () => {
    const points = buildWalkPoints({ x: 2, y: 2 }, { x: 8, y: 2 }, 5, BOUNDS)
    expect(points).toHaveLength(5)
    expect(points[0]).toEqual({ x: 2, y: 2 })
    expect(points.at(-1)).toEqual({ x: 8, y: 2 })
  })

  it('если старт и финиш почти совпали — раскладывает по кругу', () => {
    const points = buildWalkPoints({ x: 5, y: 5 }, { x: 5.1, y: 5.05 }, 4, BOUNDS)
    expect(points).toHaveLength(4)
    const unique = new Set(points.map((p) => `${p.x}:${p.y}`))
    expect(unique.size).toBeGreaterThan(2)
  })

  it('держит точки внутри плана', () => {
    const points = buildWalkPoints({ x: -5, y: -4 }, { x: 25, y: 40 }, 3, BOUNDS)
    expect(points.every((p) => p.x >= 0 && p.x <= BOUNDS.width && p.y >= 0 && p.y <= BOUNDS.height)).toBe(
      true,
    )
  })
})

describe('nearestGrowingPlanting', () => {
  it('берёт ближайшую живую посадку', () => {
    const out = nearestGrowingPlanting(
      [planting('a', 1, 1), planting('b', 1.4, 1.2), planting('c', 4, 4)],
      { x: 1.35, y: 1.15 },
      1.6,
    )
    expect(out?.id).toBe('b')
  })

  it('игнорирует погибшие и далёкие', () => {
    const out = nearestGrowingPlanting(
      [planting('a', 1, 1, 'dead'), planting('b', 8, 8), planting('c', 9, 9, 'moved')],
      { x: 1.05, y: 1.02 },
      0.5,
    )
    expect(out).toBeNull()
  })
})
