import { describe, it, expect } from 'vitest';
import {
  simplifyStroke,
  strokeIsClosed,
  convexHull,
  minAreaRect,
  snapToRectangle,
  SmartBrush,
  type Point,
} from './SmartBrush';

/** Дрожащий контур почти-прямоугольника 4×2 с шумом. */
function noisyRect(): Point[] {
  const base: Point[] = [];
  const push = (x: number, y: number) => base.push([x, y]);
  for (let x = 0; x <= 4; x += 0.5) push(x, 0.03 * Math.sin(x * 9));
  for (let y = 0; y <= 2; y += 0.5) push(4 + 0.03 * Math.sin(y * 9), y);
  for (let x = 4; x >= 0; x -= 0.5) push(x, 2 + 0.03 * Math.sin(x * 9));
  for (let y = 2; y >= 0; y -= 0.5) push(0.03 * Math.sin(y * 9), y);
  return base;
}

describe('simplifyStroke', () => {
  it('выкидывает близкие точки', () => {
    const pts: Point[] = [[0, 0], [0.01, 0], [0.02, 0], [1, 0]];
    const out = simplifyStroke(pts, 0.05);
    expect(out).toEqual([[0, 0], [1, 0]]);
  });
  it('пустой вход → пустой выход', () => {
    expect(simplifyStroke([])).toEqual([]);
  });
});

describe('strokeIsClosed', () => {
  it('замкнутый контур распознаётся', () => {
    expect(strokeIsClosed(noisyRect())).toBe(true);
  });
  it('открытая линия — нет', () => {
    expect(strokeIsClosed([[0, 0], [5, 0], [10, 0]])).toBe(false);
  });
});

describe('convexHull', () => {
  it('квадрат с внутренней точкой → 4 угла', () => {
    const hull = convexHull([[0, 0], [2, 0], [2, 2], [0, 2], [1, 1]]);
    expect(hull.length).toBe(4);
  });
});

describe('minAreaRect', () => {
  it('осеориентированный bbox для прямоугольника', () => {
    const { corners } = minAreaRect([[0, 0], [4, 0], [4, 2], [0, 2]]);
    const xs = corners.map((c) => c[0]);
    const ys = corners.map((c) => c[1]);
    expect(Math.min(...xs)).toBeCloseTo(0, 6);
    expect(Math.max(...xs)).toBeCloseTo(4, 6);
    expect(Math.min(...ys)).toBeCloseTo(0, 6);
    expect(Math.max(...ys)).toBeCloseTo(2, 6);
  });

  it('повёрнутый на 45° прямоугольник → площадь минимальна (не осевой bbox)', () => {
    // Ромб со стороной √2, площадь 2. Осевой bbox дал бы 4.
    const rot: Point[] = [[1, 0], [2, 1], [1, 2], [0, 1]];
    const { corners, angleDeg } = minAreaRect(rot);
    // Площадь через две смежные стороны.
    const side1 = Math.hypot(corners[1][0] - corners[0][0], corners[1][1] - corners[0][1]);
    const side2 = Math.hypot(corners[2][0] - corners[1][0], corners[2][1] - corners[1][1]);
    expect(side1 * side2).toBeCloseTo(2, 4);
    expect(Math.abs(angleDeg)).toBeCloseTo(45, 1);
  });
});

describe('snapToRectangle', () => {
  it('дрожащий контур 4×2 → ровный прямоугольник', () => {
    const res = snapToRectangle(noisyRect());
    expect(res).not.toBeNull();
    expect(res!.closed).toBe(true);
    expect(res!.points.length).toBe(4);
    const xs = res!.points.map((p) => p[0]);
    const ys = res!.points.map((p) => p[1]);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(4, 0);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(2, 0);
  });

  it('слишком мелкий/короткий штрих → null', () => {
    expect(snapToRectangle([[0, 0], [0.01, 0]])).toBeNull();
    expect(snapToRectangle([[0, 0], [0.02, 0], [0.01, 0.02]])).toBeNull();
  });
});

describe('SmartBrush', () => {
  it('накопление и снап', () => {
    const brush = new SmartBrush();
    brush.begin(0, 0);
    brush.add(4, 0);
    brush.add(4, 2);
    brush.add(0, 2);
    brush.add(0, 0);
    expect(brush.points.length).toBe(5);
    const res = brush.snap();
    expect(res).not.toBeNull();
    expect(res!.points.length).toBe(4);
    // После снапа штрих сброшен.
    expect(brush.points.length).toBe(0);
  });

  it('reset очищает штрих', () => {
    const brush = new SmartBrush();
    brush.begin(1, 1);
    brush.add(2, 2);
    brush.reset();
    expect(brush.points.length).toBe(0);
  });
});
