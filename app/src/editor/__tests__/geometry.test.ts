/**
 * Тесты геометрии редактора: привязка, прямоугольник (углы, перенос,
 * растяжение за угол и кромку), круг, ломаная, контуры, распознавание
 * прямоугольника в легаси-полигонах.
 */

import { describe, it, expect } from 'vitest';
import {
  snap,
  snapAngle,
  normalizeAngle,
  round2,
  rectCorners,
  snapRectPosition,
  resizeRect,
  resizeRectEdge,
  resizeCircle,
  moveLineVertex,
  rotationFromPointer,
  moveShape,
  snapShapePosition,
  shapeBBox,
  shapeOutline,
  lineOutline,
  pointInShape,
  rectFromPolygon,
  type RectShape,
  type LineShape,
  type CircleShape,
} from '../geometry';

describe('snap / углы', () => {
  it('привязывает к шагу 0,5 м', () => {
    expect(snap(1.24)).toBe(1);
    expect(snap(1.26)).toBe(1.5);
    expect(snap(-0.3)).toBe(-0.5);
    expect(snap(0.75)).toBe(1); // на середине — вверх
  });

  it('привязывает угол к 15°', () => {
    expect(snapAngle(7)).toBe(0);
    expect(snapAngle(8)).toBe(15);
    expect(snapAngle(359)).toBe(0);
    expect(snapAngle(-14)).toBe(345);
  });

  it('нормализует углы в [0, 360)', () => {
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(-90)).toBe(270);
    expect(normalizeAngle(725)).toBe(5);
  });
});

describe('прямоугольник', () => {
  const house: RectShape = { kind: 'rect', cx: 10, cy: 8, w: 6, h: 4, rot: 0 };

  it('углы без поворота', () => {
    expect(rectCorners(house)).toEqual([
      [7, 6],
      [13, 6],
      [13, 10],
      [7, 10],
    ]);
  });

  it('углы с поворотом 90° остаются прямыми', () => {
    const r = rectCorners({ ...house, rot: 90 });
    // ширина и глубина меняются местами вокруг того же центра
    expect(r).toEqual([
      [12, 5],
      [12, 11],
      [8, 11],
      [8, 5],
    ]);
  });

  it('перенос: при 0° к сетке привязывается УГОЛ (габарит 2,5 м)', () => {
    const odd: RectShape = { kind: 'rect', cx: 3.37, cy: 2.11, w: 2.5, h: 1.5, rot: 0 };
    const snapped = snapRectPosition(odd);
    const [minX, minY] = rectCorners(snapped)[0];
    expect(minX % 0.5).toBe(0);
    expect(minY % 0.5).toBe(0);
  });

  it('перенос: при 90° угол тоже на сетке (габариты меняются местами)', () => {
    const odd: RectShape = { kind: 'rect', cx: 3.33, cy: 2.17, w: 2.5, h: 1, rot: 90 };
    const box = shapeBBox(snapRectPosition(odd));
    expect(round2(box.minX * 2) % 1).toBe(0);
    expect(round2(box.minY * 2) % 1).toBe(0);
  });

  it('перенос: при 45° привязывается центр', () => {
    const odd: RectShape = { ...house, cx: 3.37, cy: 2.11, rot: 45 };
    const snapped = snapRectPosition(odd);
    expect(snapped.cx).toBe(3.5);
    expect(snapped.cy).toBe(2);
  });

  it('растяжение за угол SE: противоположный угол NW стоит на месте', () => {
    const next = resizeRect(house, 'se', { x: 14, y: 11 }, true);
    expect(next.w).toBe(7);
    expect(next.h).toBe(5);
    expect(rectCorners(next)[0]).toEqual(rectCorners(house)[0]); // NW не сдвинулся
  });

  it('растяжение с магнитом идёт шагом 0,5 м', () => {
    const next = resizeRect(house, 'se', { x: 13.72, y: 10.23 }, true);
    expect(next.w).toBe(6.5);
    expect(next.h).toBe(4);
  });

  it('растяжение без магнита — свободное', () => {
    const next = resizeRect(house, 'se', { x: 13.72, y: 10.23 }, false);
    expect(next.w).toBeCloseTo(6.72, 2);
    expect(next.h).toBeCloseTo(4.23, 2);
  });

  it('не даёт габарит меньше 0,5 м', () => {
    const next = resizeRect(house, 'se', { x: 7.05, y: 6.05 }, false);
    expect(next.w).toBeGreaterThanOrEqual(0.5);
    expect(next.h).toBeGreaterThanOrEqual(0.5);
  });

  it('растяжение за кромку E: западная стена стоит', () => {
    const next = resizeRectEdge(house, 'e', { x: 15, y: 99 }, true);
    expect(next.w).toBe(8);
    expect(next.h).toBe(4); // глубина не тронута
    const westX = rectCorners(next)[0][0];
    expect(westX).toBe(7);
  });

  it('растяжение за кромку N повёрнутого дома работает в его осях', () => {
    const rotated: RectShape = { ...house, rot: 90 };
    const next = resizeRectEdge(rotated, 'n', { x: 14, y: 8 }, true);
    expect(next.h).toBe(6); // «север» дома смотрит на восток листа
    expect(next.w).toBe(6);
  });

  it('поворот из указателя: ручка сверху = 0°', () => {
    expect(rotationFromPointer({ x: 0, y: 0 }, { x: 0, y: -1 })).toBe(0);
    expect(rotationFromPointer({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(90);
    expect(rotationFromPointer({ x: 0, y: 0 }, { x: 0, y: 1 })).toBe(180);
  });
});

describe('круг и ломаная', () => {
  it('круг: диаметр привязывается к 0,5 м', () => {
    const c: CircleShape = { kind: 'circle', cx: 5, cy: 5, r: 1 };
    const next = resizeCircle(c, { x: 6.6, y: 5 }, true);
    expect(next.r).toBe(1.5); // диаметр 3,2 → 3
  });

  it('круг: минимальный диаметр 0,5 м', () => {
    const c: CircleShape = { kind: 'circle', cx: 5, cy: 5, r: 1 };
    const next = resizeCircle(c, { x: 5.01, y: 5 }, true);
    expect(next.r).toBe(0.25);
  });

  it('вершина ломаной прилипает к сетке', () => {
    const l: LineShape = { kind: 'line', pts: [[0, 0], [4, 0]], width: 1 };
    const next = moveLineVertex(l, 1, { x: 4.23, y: 1.77 }, true);
    expect(next.pts[1]).toEqual([4, 2]);
    expect(next.pts[0]).toEqual([0, 0]);
  });

  it('контур ломаной шириной 1 м — прямоугольник вокруг осевой', () => {
    const l: LineShape = { kind: 'line', pts: [[0, 0], [4, 0]], width: 1 };
    const outline = lineOutline(l);
    expect(outline).toHaveLength(4);
    const box = shapeBBox(l);
    expect(box).toEqual({ minX: -0.5, minY: -0.5, maxX: 4.5, maxY: 0.5 });
  });

  it('перенос формы сдвигает все вершины', () => {
    const l: LineShape = { kind: 'line', pts: [[0, 0], [4, 0]], width: 1 };
    const moved = moveShape(l, 2, 3);
    expect(moved.pts).toEqual([[2, 3], [6, 3]]);
  });

  it('привязка ломаной не искажает форму', () => {
    const l: LineShape = { kind: 'line', pts: [[0.2, 0.2], [4.2, 0.2], [4.2, 3.2]], width: 1 };
    const snapped = snapShapePosition(l);
    expect(snapped.pts[0]).toEqual([0, 0]);
    expect(snapped.pts[1]).toEqual([4, 0]);
    expect(snapped.pts[2]).toEqual([4, 3]);
  });
});

describe('контуры и хит-тесты', () => {
  it('контур прямоугольника — его 4 угла', () => {
    const r: RectShape = { kind: 'rect', cx: 1, cy: 1, w: 2, h: 2, rot: 0 };
    expect(shapeOutline(r)).toHaveLength(4);
  });

  it('контур круга — 24-угольник радиуса r', () => {
    const outline = shapeOutline({ kind: 'circle', cx: 0, cy: 0, r: 2 });
    expect(outline).toHaveLength(24);
    for (const [x, y] of outline) {
      expect(Math.hypot(x, y)).toBeCloseTo(2, 1);
    }
  });

  it('точка внутри/снаружи формы', () => {
    const r: RectShape = { kind: 'rect', cx: 5, cy: 5, w: 4, h: 2, rot: 0 };
    expect(pointInShape({ x: 5, y: 5 }, r)).toBe(true);
    expect(pointInShape({ x: 5, y: 6.5 }, r)).toBe(false);
    expect(pointInShape({ x: 1, y: 1 }, { kind: 'circle', cx: 0, cy: 0, r: 1 })).toBe(false);
    expect(pointInShape({ x: 0.5, y: 0.5 }, { kind: 'circle', cx: 0, cy: 0, r: 1 })).toBe(true);
  });
});

describe('rectFromPolygon (импорт легаси)', () => {
  it('распознаёт прямоугольник без поворота', () => {
    const rect = rectFromPolygon([[2, 2], [8, 2], [8, 6], [2, 6]]);
    expect(rect).toEqual({ kind: 'rect', cx: 5, cy: 4, w: 6, h: 4, rot: 0 });
  });

  it('распознаёт повёрнутый прямоугольник', () => {
    const src: RectShape = { kind: 'rect', cx: 5, cy: 5, w: 4, h: 2, rot: 30 };
    const rect = rectFromPolygon(rectCorners(src));
    expect(rect).not.toBeNull();
    expect(rect!.w).toBeCloseTo(4, 1);
    expect(rect!.h).toBeCloseTo(2, 1);
    expect(rect!.rot).toBeCloseTo(30, 0);
  });

  it('отвергает произвольный четырёхугольник', () => {
    expect(rectFromPolygon([[0, 0], [6, 1], [5, 6], [0, 4]])).toBeNull();
  });

  it('отвергает не-четырёхугольники', () => {
    expect(rectFromPolygon([[0, 0], [1, 0], [1, 1]])).toBeNull();
  });
});
