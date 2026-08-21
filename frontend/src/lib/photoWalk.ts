import type { Pt } from './geometry'
import { dist } from './geometry'
import type { Planting } from './types'

interface Bounds {
  width: number
  height: number
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function clampPoint(p: Pt, bounds: Bounds): Pt {
  return {
    x: clamp(Math.round(p.x * 100) / 100, 0, bounds.width),
    y: clamp(Math.round(p.y * 100) / 100, 0, bounds.height),
  }
}

function spreadAround(center: Pt, count: number, bounds: Bounds): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < count; i++) {
    const ring = 1 + Math.floor(i / 6)
    const angle = (Math.PI * 2 * i) / Math.max(6, count)
    const radius = 0.35 + ring * 0.3
    out.push(
      clampPoint(
        {
          x: center.x + Math.cos(angle) * radius,
          y: center.y + Math.sin(angle) * radius,
        },
        bounds,
      ),
    )
  }
  return out
}

/** Точки серии фото: от старта к финишу, с небольшим «змейкой» в середине. */
export function buildWalkPoints(start: Pt, end: Pt, count: number, bounds: Bounds): Pt[] {
  if (count <= 0) return []
  if (count === 1) return [clampPoint(start, bounds)]

  const dx = end.x - start.x
  const dy = end.y - start.y
  const len = Math.hypot(dx, dy)
  if (len < 0.35) return spreadAround(start, count, bounds)

  const nx = -dy / len
  const ny = dx / len
  const sideShift = Math.min(0.35, Math.max(0.15, len * 0.04))

  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1)
    const x = start.x + dx * t
    const y = start.y + dy * t
    if (i === 0 || i === count - 1) return clampPoint({ x, y }, bounds)
    const side = i % 2 === 0 ? 1 : -1
    return clampPoint({ x: x + nx * sideShift * side, y: y + ny * sideShift * side }, bounds)
  })
}

/** «Узнаём» ближайшую живую посадку рядом с точкой маршрута. */
export function nearestGrowingPlanting(
  plantings: Planting[],
  point: Pt,
  maxDistanceM = 1.6,
): Planting | null {
  let best: Planting | null = null
  let bestDist = Number.POSITIVE_INFINITY
  for (const pl of plantings) {
    if (pl.status !== 'growing') continue
    const d = dist(point, { x: pl.x, y: pl.y })
    if (d <= maxDistanceM && d < bestDist) {
      best = pl
      bestDist = d
    }
  }
  return best
}
