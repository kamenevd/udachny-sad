import { describe, expect, it } from 'vitest'
import {
  clamp,
  dist,
  distToSegment,
  dragHandle,
  dragRotate,
  extendLine,
  hitShape,
  insertPolyPoint,
  keepInside,
  type LineShape,
  moveShape,
  type PolyShape,
  rectCorners,
  rectRotateHandle,
  removePolyPoint,
  rotatePt,
  type RectShape,
  shapeBounds,
  shapeCenter,
  shapeHandles,
  shrinkLine,
  snap,
  snapShape,
  toPoly,
} from './geometry'

const rect: RectShape = { t: 'rect', x: 2, y: 3, w: 4, h: 2 }
const line: LineShape = { t: 'line', pts: [[0, 0], [4, 0], [4, 3]], w: 1 }
const poly: PolyShape = { t: 'poly', pts: [[0, 0], [4, 0], [4, 4], [0, 4]] }

describe('snap/clamp', () => {
  it('привязывает к сетке 0.25 м', () => {
    expect(snap(1.13)).toBe(1.25)
    expect(snap(1.12)).toBe(1)
    expect(snap(-0.3)).toBe(-0.25)
  })
  it('clamp держит в границах', () => {
    expect(clamp(5, 0, 3)).toBe(3)
    expect(clamp(-1, 0, 3)).toBe(0)
    expect(clamp(2, 0, 3)).toBe(2)
  })
})

describe('расстояния', () => {
  it('dist по гипотенузе', () => {
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })
  it('distToSegment до середины и до конца отрезка', () => {
    expect(distToSegment({ x: 2, y: 1 }, { x: 0, y: 0 }, { x: 4, y: 0 })).toBe(1)
    expect(distToSegment({ x: 7, y: 4 }, { x: 0, y: 0 }, { x: 4, y: 0 })).toBe(5)
  })
})

describe('центр и границы фигур', () => {
  it('rect', () => {
    expect(shapeCenter(rect)).toEqual({ x: 4, y: 4 })
    expect(shapeBounds(rect)).toEqual({ x: 2, y: 3, w: 4, h: 2 })
  })
  it('circle', () => {
    const c = { t: 'circle', cx: 1, cy: 1, r: 2 } as const
    expect(shapeCenter(c)).toEqual({ x: 1, y: 1 })
    expect(shapeBounds(c)).toEqual({ x: -1, y: -1, w: 4, h: 4 })
  })
  it('line учитывает ширину', () => {
    const b = shapeBounds(line)
    expect(b).toEqual({ x: -0.5, y: -0.5, w: 5, h: 4 })
  })
})

describe('hitShape', () => {
  it('rect: внутри, снаружи, с допуском', () => {
    expect(hitShape(rect, { x: 3, y: 4 })).toBe(true)
    expect(hitShape(rect, { x: 1, y: 1 })).toBe(false)
    expect(hitShape(rect, { x: 1.8, y: 3 }, 0.3)).toBe(true)
  })
  it('circle и ellipse', () => {
    expect(hitShape({ t: 'circle', cx: 0, cy: 0, r: 1 }, { x: 0.5, y: 0.5 })).toBe(true)
    expect(hitShape({ t: 'circle', cx: 0, cy: 0, r: 1 }, { x: 1.2, y: 0 })).toBe(false)
    expect(hitShape({ t: 'ellipse', cx: 0, cy: 0, rx: 2, ry: 1 }, { x: 1.9, y: 0 })).toBe(true)
    expect(hitShape({ t: 'ellipse', cx: 0, cy: 0, rx: 2, ry: 1 }, { x: 0, y: 1.1 })).toBe(false)
  })
  it('line: попадание в полосу вдоль сегментов', () => {
    expect(hitShape(line, { x: 2, y: 0.4 })).toBe(true)
    expect(hitShape(line, { x: 2, y: 1.2 })).toBe(false)
    expect(hitShape(line, { x: 4.3, y: 2 })).toBe(true)
  })
})

describe('перемещение и снап', () => {
  it('moveShape двигает все типы', () => {
    expect(moveShape(rect, 1, -1)).toEqual({ t: 'rect', x: 3, y: 2, w: 4, h: 2 })
    const moved = moveShape(line, 1, 1) as LineShape
    expect(moved.pts[0]).toEqual([1, 1])
    expect(moved.pts[2]).toEqual([5, 4])
  })
  it('snapShape не даёт нулевых размеров', () => {
    const s = snapShape({ t: 'rect', x: 0.1, y: 0.1, w: 0.05, h: 0.05 })
    expect(s).toEqual({ t: 'rect', x: 0, y: 0, w: 0.25, h: 0.25 })
  })
})

describe('ручки редактирования', () => {
  it('у rect четыре угла, у line — все точки', () => {
    expect(shapeHandles(rect)).toHaveLength(4)
    expect(shapeHandles(line)).toHaveLength(3)
  })
  it('dragHandle rect держит противоположный угол на месте', () => {
    const out = dragHandle(rect, 2, { x: 8, y: 7 }) as RectShape
    expect(out.x).toBe(2)
    expect(out.y).toBe(3)
    expect(out.w).toBe(6)
    expect(out.h).toBe(4)
  })
  it('dragHandle rect не схлопывает фигуру', () => {
    const out = dragHandle(rect, 2, { x: 2, y: 3 }) as RectShape
    expect(out.w).toBeGreaterThanOrEqual(0.5)
    expect(out.h).toBeGreaterThanOrEqual(0.5)
  })
  it('dragHandle circle меняет радиус со снапом', () => {
    const out = dragHandle({ t: 'circle', cx: 0, cy: 0, r: 1 }, 0, { x: 2.1, y: 0 })
    expect(out).toEqual({ t: 'circle', cx: 0, cy: 0, r: 2 })
  })
})

describe('ломаная: добавить/убрать точку', () => {
  it('extendLine продолжает направление', () => {
    const out = extendLine({ t: 'line', pts: [[0, 0], [2, 0]], w: 1 }, 1.5)
    expect(out.pts).toHaveLength(3)
    expect(out.pts[2]).toEqual([3.5, 0])
  })
  it('shrinkLine не опускается ниже двух точек', () => {
    const two: LineShape = { t: 'line', pts: [[0, 0], [1, 1]], w: 1 }
    expect(shrinkLine(two)).toBe(two)
    expect(shrinkLine(line).pts).toHaveLength(2)
  })
})

describe('поворот прямоугольника', () => {
  it('rotatePt: 90° по часовой при y вниз', () => {
    const out = rotatePt({ x: 1, y: 0 }, { x: 0, y: 0 }, 90)
    expect(out.x).toBeCloseTo(0)
    expect(out.y).toBeCloseTo(1)
  })
  it('rectCorners при повороте 90° меняет ширину и высоту местами', () => {
    const r: RectShape = { ...rect, a: 90 }
    const b = shapeBounds(r)
    expect(b.w).toBeCloseTo(2)
    expect(b.h).toBeCloseTo(4)
    // центр не двигается
    expect(shapeCenter(r)).toEqual({ x: 4, y: 4 })
  })
  it('hitShape учитывает поворот', () => {
    const r: RectShape = { t: 'rect', x: -2, y: -0.5, w: 4, h: 1, a: 90 }
    // повёрнутый на 90° лежачий прямоугольник становится стоячим
    expect(hitShape(r, { x: 0, y: 1.8 })).toBe(true)
    expect(hitShape(r, { x: 1.8, y: 0 })).toBe(false)
  })
  it('dragRotate ставит угол с шагом 5° и убирает 0', () => {
    const r: RectShape = { t: 'rect', x: -1, y: -1, w: 2, h: 2 }
    // ручка справа от центра → 90°
    expect((dragRotate(r, { x: 3, y: 0 }) as RectShape).a).toBe(90)
    // ручка сверху → без поворота
    expect((dragRotate(r, { x: 0, y: -3 }) as RectShape).a).toBeUndefined()
  })
  it('ручка поворота стоит над верхней стороной и поворачивается вместе с фигурой', () => {
    const r: RectShape = { t: 'rect', x: -1, y: -1, w: 2, h: 2 }
    expect(rectRotateHandle(r, 1)).toEqual({ x: 0, y: -2 })
    const h = rectRotateHandle({ ...r, a: 90 }, 1)
    expect(h.x).toBeCloseTo(2)
    expect(h.y).toBeCloseTo(0)
  })
  it('dragHandle повёрнутого rect держит противоположный угол в мире', () => {
    const r: RectShape = { t: 'rect', x: 0, y: 0, w: 4, h: 2, a: 30 }
    const anchorBefore = rectCorners(r)[0]
    const out = dragHandle(r, 2, { x: 6, y: 5 }) as RectShape
    const anchorAfter = rectCorners(out)[0]
    expect(anchorAfter.x).toBeCloseTo(anchorBefore.x)
    expect(anchorAfter.y).toBeCloseTo(anchorBefore.y)
    expect(out.a).toBe(30)
  })
})

describe('свободный многоугольник', () => {
  it('центр, границы, ручки', () => {
    expect(shapeCenter(poly)).toEqual({ x: 2, y: 2 })
    expect(shapeBounds(poly)).toEqual({ x: 0, y: 0, w: 4, h: 4 })
    expect(shapeHandles(poly)).toHaveLength(4)
  })
  it('hitShape: внутри, снаружи, у ребра с допуском', () => {
    expect(hitShape(poly, { x: 2, y: 2 })).toBe(true)
    expect(hitShape(poly, { x: 5, y: 5 })).toBe(false)
    expect(hitShape(poly, { x: 4.2, y: 2 }, 0.3)).toBe(true)
  })
  it('moveShape и snapShape работают с poly', () => {
    const moved = moveShape(poly, 1, 1) as PolyShape
    expect(moved.pts[0]).toEqual([1, 1])
    const snapped = snapShape({ t: 'poly', pts: [[0.1, 0.1], [3.9, 0], [2, 4.13]] }) as PolyShape
    expect(snapped.pts[0]).toEqual([0, 0])
    expect(snapped.pts[2]).toEqual([2, 4.25])
  })
  it('dragHandle двигает вершину со снапом', () => {
    const out = dragHandle(poly, 1, { x: 5.1, y: -0.9 }) as PolyShape
    expect(out.pts[1]).toEqual([5, -1])
  })
  it('toPoly: rect с поворотом → 4 вершины, ellipse → 8', () => {
    const p = toPoly({ t: 'rect', x: 0, y: 0, w: 2, h: 2, a: 45 })
    expect(p.pts).toHaveLength(4)
    const e = toPoly({ t: 'ellipse', cx: 0, cy: 0, rx: 2, ry: 1 })
    expect(e.pts).toHaveLength(8)
    expect(e.pts[0][0]).toBeCloseTo(2)
  })
  it('insertPolyPoint делит самую длинную сторону', () => {
    const tri: PolyShape = { t: 'poly', pts: [[0, 0], [8, 0], [0, 2]] }
    const out = insertPolyPoint(tri)
    expect(out.pts).toHaveLength(4)
    expect(out.pts[2]).toEqual([4, 1]) // середина гипотенузы (длиннейшей)
  })
  it('removePolyPoint убирает самую лишнюю точку и не идёт ниже трёх', () => {
    const withExtra: PolyShape = { t: 'poly', pts: [[0, 0], [2, 0.05], [4, 0], [4, 4], [0, 4]] }
    const out = removePolyPoint(withExtra)
    expect(out.pts).toHaveLength(4)
    expect(out.pts.some(([x, y]) => x === 2 && y === 0.05)).toBe(false)
    const tri: PolyShape = { t: 'poly', pts: [[0, 0], [4, 0], [0, 4]] }
    expect(removePolyPoint(tri)).toBe(tri)
  })
})

describe('keepInside', () => {
  it('возвращает фигуру, если центр в участке', () => {
    expect(keepInside(rect, 10, 10)).toBe(rect)
  })
  it('затягивает центр обратно в границы', () => {
    const out = keepInside({ t: 'circle', cx: 15, cy: -3, r: 1 }, 10, 10)
    expect(shapeCenter(out)).toEqual({ x: 10, y: 0 })
  })
})
