/**
 * Геометрия плана. Все координаты — в метрах, в системе координат участка
 * (0,0 — левый верхний угол). Чистые функции, покрыты юнит-тестами.
 */

export interface Pt {
  x: number
  y: number
}

export interface RectShape {
  t: 'rect'
  x: number
  y: number
  w: number
  h: number
}

export interface CircleShape {
  t: 'circle'
  cx: number
  cy: number
  r: number
}

export interface EllipseShape {
  t: 'ellipse'
  cx: number
  cy: number
  rx: number
  ry: number
}

/** Ломаная с шириной (дорожка, изгородь). */
export interface LineShape {
  t: 'line'
  pts: [number, number][]
  w: number
}

export type Shape = RectShape | CircleShape | EllipseShape | LineShape

export const SNAP = 0.25

export function snap(v: number, step = SNAP): number {
  return Math.round(v / step) * step
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/** Расстояние от точки p до отрезка ab. */
export function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const abx = b.x - a.x
  const aby = b.y - a.y
  const len2 = abx * abx + aby * aby
  if (len2 === 0) return dist(p, a)
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2
  t = clamp(t, 0, 1)
  return dist(p, { x: a.x + t * abx, y: a.y + t * aby })
}

export function shapeCenter(s: Shape): Pt {
  switch (s.t) {
    case 'rect':
      return { x: s.x + s.w / 2, y: s.y + s.h / 2 }
    case 'circle':
      return { x: s.cx, y: s.cy }
    case 'ellipse':
      return { x: s.cx, y: s.cy }
    case 'line': {
      const n = s.pts.length
      const sx = s.pts.reduce((acc, p) => acc + p[0], 0)
      const sy = s.pts.reduce((acc, p) => acc + p[1], 0)
      return { x: sx / n, y: sy / n }
    }
  }
}

export function shapeBounds(s: Shape): { x: number; y: number; w: number; h: number } {
  switch (s.t) {
    case 'rect':
      return { x: s.x, y: s.y, w: s.w, h: s.h }
    case 'circle':
      return { x: s.cx - s.r, y: s.cy - s.r, w: s.r * 2, h: s.r * 2 }
    case 'ellipse':
      return { x: s.cx - s.rx, y: s.cy - s.ry, w: s.rx * 2, h: s.ry * 2 }
    case 'line': {
      const xs = s.pts.map((p) => p[0])
      const ys = s.pts.map((p) => p[1])
      const pad = s.w / 2
      const minX = Math.min(...xs) - pad
      const minY = Math.min(...ys) - pad
      return {
        x: minX,
        y: minY,
        w: Math.max(...xs) + pad - minX,
        h: Math.max(...ys) + pad - minY,
      }
    }
  }
}

/** Попадание точки в фигуру с допуском tol (в метрах). */
export function hitShape(s: Shape, p: Pt, tol = 0): boolean {
  switch (s.t) {
    case 'rect':
      return (
        p.x >= s.x - tol && p.x <= s.x + s.w + tol && p.y >= s.y - tol && p.y <= s.y + s.h + tol
      )
    case 'circle':
      return dist(p, { x: s.cx, y: s.cy }) <= s.r + tol
    case 'ellipse': {
      const rx = s.rx + tol
      const ry = s.ry + tol
      const dx = (p.x - s.cx) / rx
      const dy = (p.y - s.cy) / ry
      return dx * dx + dy * dy <= 1
    }
    case 'line': {
      const half = s.w / 2 + tol
      for (let i = 0; i < s.pts.length - 1; i++) {
        const a = { x: s.pts[i][0], y: s.pts[i][1] }
        const b = { x: s.pts[i + 1][0], y: s.pts[i + 1][1] }
        if (distToSegment(p, a, b) <= half) return true
      }
      return false
    }
  }
}

export function moveShape(s: Shape, dx: number, dy: number): Shape {
  switch (s.t) {
    case 'rect':
      return { ...s, x: s.x + dx, y: s.y + dy }
    case 'circle':
      return { ...s, cx: s.cx + dx, cy: s.cy + dy }
    case 'ellipse':
      return { ...s, cx: s.cx + dx, cy: s.cy + dy }
    case 'line':
      return { ...s, pts: s.pts.map(([x, y]) => [x + dx, y + dy] as [number, number]) }
  }
}

export function snapShape(s: Shape, step = SNAP): Shape {
  switch (s.t) {
    case 'rect':
      return {
        ...s,
        x: snap(s.x, step),
        y: snap(s.y, step),
        w: Math.max(step, snap(s.w, step)),
        h: Math.max(step, snap(s.h, step)),
      }
    case 'circle':
      return { ...s, cx: snap(s.cx, step), cy: snap(s.cy, step), r: Math.max(step, snap(s.r, step)) }
    case 'ellipse':
      return {
        ...s,
        cx: snap(s.cx, step),
        cy: snap(s.cy, step),
        rx: Math.max(step, snap(s.rx, step)),
        ry: Math.max(step, snap(s.ry, step)),
      }
    case 'line':
      return {
        ...s,
        pts: s.pts.map(([x, y]) => [snap(x, step), snap(y, step)] as [number, number]),
      }
  }
}

/** Точки-ручки для редактирования фигуры. */
export function shapeHandles(s: Shape): Pt[] {
  switch (s.t) {
    case 'rect':
      return [
        { x: s.x, y: s.y },
        { x: s.x + s.w, y: s.y },
        { x: s.x + s.w, y: s.y + s.h },
        { x: s.x, y: s.y + s.h },
      ]
    case 'circle': {
      const d = s.r * Math.SQRT1_2
      return [{ x: s.cx + d, y: s.cy + d }]
    }
    case 'ellipse':
      return [
        { x: s.cx + s.rx, y: s.cy },
        { x: s.cx, y: s.cy + s.ry },
      ]
    case 'line':
      return s.pts.map(([x, y]) => ({ x, y }))
  }
}

const MIN_SIZE = 0.5

/** Перетаскивание ручки idx в точку p (с привязкой к сетке). */
export function dragHandle(s: Shape, idx: number, p: Pt): Shape {
  const px = snap(p.x)
  const py = snap(p.y)
  switch (s.t) {
    case 'rect': {
      // Противоположный угол остаётся на месте.
      const anchors: Pt[] = [
        { x: s.x + s.w, y: s.y + s.h },
        { x: s.x, y: s.y + s.h },
        { x: s.x, y: s.y },
        { x: s.x + s.w, y: s.y },
      ]
      const a = anchors[idx]
      const x1 = Math.min(a.x, px)
      const y1 = Math.min(a.y, py)
      const w = Math.max(MIN_SIZE, Math.abs(a.x - px))
      const h = Math.max(MIN_SIZE, Math.abs(a.y - py))
      return { ...s, x: x1, y: y1, w, h }
    }
    case 'circle': {
      const r = Math.max(SNAP, snap(dist(p, { x: s.cx, y: s.cy })))
      return { ...s, r }
    }
    case 'ellipse': {
      if (idx === 0) return { ...s, rx: Math.max(SNAP, snap(Math.abs(p.x - s.cx))) }
      return { ...s, ry: Math.max(SNAP, snap(Math.abs(p.y - s.cy))) }
    }
    case 'line': {
      const pts = s.pts.map((pt, i) => (i === idx ? ([px, py] as [number, number]) : pt))
      return { ...s, pts }
    }
  }
}

/** Добавить точку к ломаной, продолжая направление последнего сегмента. */
export function extendLine(s: LineShape, step = 1.5): LineShape {
  const n = s.pts.length
  const [ax, ay] = s.pts[n - 2]
  const [bx, by] = s.pts[n - 1]
  const len = Math.hypot(bx - ax, by - ay) || 1
  const nx = bx + ((bx - ax) / len) * step
  const ny = by + ((by - ay) / len) * step
  return { ...s, pts: [...s.pts, [snap(nx), snap(ny)]] }
}

/** Удалить последнюю точку ломаной (минимум две точки). */
export function shrinkLine(s: LineShape): LineShape {
  if (s.pts.length <= 2) return s
  return { ...s, pts: s.pts.slice(0, -1) }
}

/** Сдвинуть фигуру так, чтобы её центр не выходил за пределы участка. */
export function keepInside(s: Shape, plotW: number, plotH: number): Shape {
  const c = shapeCenter(s)
  const dx = clamp(c.x, 0, plotW) - c.x
  const dy = clamp(c.y, 0, plotH) - c.y
  if (dx === 0 && dy === 0) return s
  return moveShape(s, dx, dy)
}
