import { describe, expect, it } from 'vitest'
import {
  clamp,
  dist,
  distToSegment,
  dragHandle,
  extendLine,
  hitShape,
  keepInside,
  type LineShape,
  moveShape,
  type RectShape,
  shapeBounds,
  shapeCenter,
  shapeHandles,
  shrinkLine,
  snap,
  snapShape,
} from './geometry'

const rect: RectShape = { t: 'rect', x: 2, y: 3, w: 4, h: 2 }
const line: LineShape = { t: 'line', pts: [[0, 0], [4, 0], [4, 3]], w: 1 }

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

describe('keepInside', () => {
  it('возвращает фигуру, если центр в участке', () => {
    expect(keepInside(rect, 10, 10)).toBe(rect)
  })
  it('затягивает центр обратно в границы', () => {
    const out = keepInside({ t: 'circle', cx: 15, cy: -3, r: 1 }, 10, 10)
    expect(shapeCenter(out)).toEqual({ x: 10, y: 0 })
  })
})
