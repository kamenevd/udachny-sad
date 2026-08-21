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
  /** Поворот в градусах вокруг центра (по часовой), 0 — без поворота. */
  a?: number
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

/** Замкнутый многоугольник свободной формы (минимум 3 точки). */
export interface PolyShape {
  t: 'poly'
  pts: [number, number][]
}

export type Shape = RectShape | CircleShape | EllipseShape | LineShape | PolyShape

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

/** Поворот точки p вокруг центра c на deg градусов (по часовой при y вниз). */
export function rotatePt(p: Pt, c: Pt, deg: number): Pt {
  if (!deg) return p
  const rad = (deg * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const dx = p.x - c.x
  const dy = p.y - c.y
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos }
}

/** Углы прямоугольника в мировых координатах (с учётом поворота). */
export function rectCorners(s: RectShape): Pt[] {
  const c = { x: s.x + s.w / 2, y: s.y + s.h / 2 }
  const corners: Pt[] = [
    { x: s.x, y: s.y },
    { x: s.x + s.w, y: s.y },
    { x: s.x + s.w, y: s.y + s.h },
    { x: s.x, y: s.y + s.h },
  ]
  return corners.map((p) => rotatePt(p, c, s.a ?? 0))
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
    case 'line':
    case 'poly': {
      const n = s.pts.length
      const sx = s.pts.reduce((acc, p) => acc + p[0], 0)
      const sy = s.pts.reduce((acc, p) => acc + p[1], 0)
      return { x: sx / n, y: sy / n }
    }
  }
}

export function shapeBounds(s: Shape): { x: number; y: number; w: number; h: number } {
  switch (s.t) {
    case 'rect': {
      if (!s.a) return { x: s.x, y: s.y, w: s.w, h: s.h }
      const cs = rectCorners(s)
      const xs = cs.map((p) => p.x)
      const ys = cs.map((p) => p.y)
      const minX = Math.min(...xs)
      const minY = Math.min(...ys)
      return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY }
    }
    case 'poly': {
      const xs = s.pts.map((p) => p[0])
      const ys = s.pts.map((p) => p[1])
      const minX = Math.min(...xs)
      const minY = Math.min(...ys)
      return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY }
    }
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

/** Точка внутри многоугольника (лучевой алгоритм). */
function pointInPoly(p: Pt, pts: [number, number][]): boolean {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]
    const [xj, yj] = pts[j]
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/** Попадание точки в фигуру с допуском tol (в метрах). */
export function hitShape(s: Shape, p: Pt, tol = 0): boolean {
  switch (s.t) {
    case 'rect': {
      const q = s.a ? rotatePt(p, { x: s.x + s.w / 2, y: s.y + s.h / 2 }, -s.a) : p
      return (
        q.x >= s.x - tol && q.x <= s.x + s.w + tol && q.y >= s.y - tol && q.y <= s.y + s.h + tol
      )
    }
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
    case 'poly': {
      if (pointInPoly(p, s.pts)) return true
      if (tol <= 0) return false
      for (let i = 0, j = s.pts.length - 1; i < s.pts.length; j = i++) {
        const a = { x: s.pts[j][0], y: s.pts[j][1] }
        const b = { x: s.pts[i][0], y: s.pts[i][1] }
        if (distToSegment(p, a, b) <= tol) return true
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
    case 'poly':
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
    case 'poly':
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
      return rectCorners(s)
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
    case 'poly':
      return s.pts.map(([x, y]) => ({ x, y }))
  }
}

/** Ручка поворота прямоугольника: над серединой верхней стороны, off — отступ в метрах. */
export function rectRotateHandle(s: RectShape, off: number): Pt {
  const c = { x: s.x + s.w / 2, y: s.y + s.h / 2 }
  return rotatePt({ x: c.x, y: s.y - off }, c, s.a ?? 0)
}

/** Поворот прямоугольника ручкой к точке p (шаг 5°). */
export function dragRotate(s: RectShape, p: Pt): RectShape {
  const c = { x: s.x + s.w / 2, y: s.y + s.h / 2 }
  const raw = (Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI + 90
  let a = Math.round(raw / 5) * 5
  a = ((a % 360) + 360) % 360
  return a === 0 ? { ...s, a: undefined } : { ...s, a }
}

const MIN_SIZE = 0.5

/** Перетаскивание ручки idx в точку p (с привязкой к сетке). */
export function dragHandle(s: Shape, idx: number, p: Pt): Shape {
  const px = snap(p.x)
  const py = snap(p.y)
  switch (s.t) {
    case 'rect': {
      // Противоположный угол остаётся на месте (в локальных осях фигуры).
      const ang = s.a ?? 0
      const c0 = { x: s.x + s.w / 2, y: s.y + s.h / 2 }
      const lp = rotatePt(p, c0, -ang)
      const lx = snap(lp.x)
      const ly = snap(lp.y)
      const anchors: Pt[] = [
        { x: s.x + s.w, y: s.y + s.h },
        { x: s.x, y: s.y + s.h },
        { x: s.x, y: s.y },
        { x: s.x + s.w, y: s.y },
      ]
      const a = anchors[idx]
      const x1 = Math.min(a.x, lx)
      const y1 = Math.min(a.y, ly)
      const w = Math.max(MIN_SIZE, Math.abs(a.x - lx))
      const h = Math.max(MIN_SIZE, Math.abs(a.y - ly))
      if (!ang) return { ...s, x: x1, y: y1, w, h }
      // Новый центр меняет ось поворота — вернём якорный угол на прежнее место.
      const c1 = { x: x1 + w / 2, y: y1 + h / 2 }
      const before = rotatePt(a, c0, ang)
      const after = rotatePt(a, c1, ang)
      return { ...s, x: x1 + before.x - after.x, y: y1 + before.y - after.y, w, h }
    }
    case 'circle': {
      const r = Math.max(SNAP, snap(dist(p, { x: s.cx, y: s.cy })))
      return { ...s, r }
    }
    case 'ellipse': {
      if (idx === 0) return { ...s, rx: Math.max(SNAP, snap(Math.abs(p.x - s.cx))) }
      return { ...s, ry: Math.max(SNAP, snap(Math.abs(p.y - s.cy))) }
    }
    case 'line':
    case 'poly': {
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

/** Превратить фигуру в свободный многоугольник (поворот учитывается). */
export function toPoly(s: RectShape | CircleShape | EllipseShape | PolyShape): PolyShape {
  switch (s.t) {
    case 'poly':
      return s
    case 'rect':
      return { t: 'poly', pts: rectCorners(s).map((p) => [p.x, p.y] as [number, number]) }
    case 'circle':
    case 'ellipse': {
      const rx = s.t === 'circle' ? s.r : s.rx
      const ry = s.t === 'circle' ? s.r : s.ry
      const pts: [number, number][] = []
      for (let i = 0; i < 8; i++) {
        const th = (i / 8) * Math.PI * 2
        pts.push([s.cx + rx * Math.cos(th), s.cy + ry * Math.sin(th)])
      }
      return { t: 'poly', pts }
    }
  }
}

/** Добавить точку в середину самой длинной стороны многоугольника. */
export function insertPolyPoint(s: PolyShape): PolyShape {
  let best = 0
  let bestLen = -1
  for (let i = 0; i < s.pts.length; i++) {
    const [ax, ay] = s.pts[i]
    const [bx, by] = s.pts[(i + 1) % s.pts.length]
    const len = Math.hypot(bx - ax, by - ay)
    if (len > bestLen) {
      bestLen = len
      best = i
    }
  }
  const [ax, ay] = s.pts[best]
  const [bx, by] = s.pts[(best + 1) % s.pts.length]
  const mid: [number, number] = [(ax + bx) / 2, (ay + by) / 2]
  const pts = [...s.pts.slice(0, best + 1), mid, ...s.pts.slice(best + 1)]
  return { ...s, pts }
}

/** Убрать самую «лишнюю» точку — ту, что ближе всех к прямой между соседями. */
export function removePolyPoint(s: PolyShape): PolyShape {
  if (s.pts.length <= 3) return s
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < s.pts.length; i++) {
    const prev = s.pts[(i - 1 + s.pts.length) % s.pts.length]
    const next = s.pts[(i + 1) % s.pts.length]
    const d = distToSegment(
      { x: s.pts[i][0], y: s.pts[i][1] },
      { x: prev[0], y: prev[1] },
      { x: next[0], y: next[1] },
    )
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return { ...s, pts: s.pts.filter((_, i) => i !== best) }
}

/** Сдвинуть фигуру так, чтобы её центр не выходил за пределы участка. */
export function keepInside(s: Shape, plotW: number, plotH: number): Shape {
  const c = shapeCenter(s)
  const dx = clamp(c.x, 0, plotW) - c.x
  const dy = clamp(c.y, 0, plotH) - c.y
  if (dx === 0 && dy === 0) return s
  return moveShape(s, dx, dy)
}
