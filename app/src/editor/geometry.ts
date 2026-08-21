/**
 * Геометрия редактора плана (EDITOR.md) — чистые функции без DOM/React.
 *
 * Все координаты — в метрах листа. Формы параметрические: прямоугольник
 * задаётся центром/шириной/глубиной/поворотом, поэтому прямые углы
 * гарантированы конструкцией, а не аккуратностью руки.
 */

// ─── Типы форм ─────────────────────────────────────────────────────────

export interface Vec {
  x: number;
  y: number;
}

/** Прямоугольник: центр, ширина×глубина, поворот в градусах (по часовой). */
export interface RectShape {
  kind: 'rect';
  cx: number;
  cy: number;
  w: number;
  h: number;
  rot: number;
}

/** Круг: центр и радиус (крона дерева, круглая клумба). */
export interface CircleShape {
  kind: 'circle';
  cx: number;
  cy: number;
  r: number;
}

/** Ломаная с шириной: дорожка, изгородь. pts — осевая линия. */
export interface LineShape {
  kind: 'line';
  pts: [number, number][];
  width: number;
}

/** Свободный многоугольник — импорт старых объектов без параметров. */
export interface PolyShape {
  kind: 'poly';
  pts: [number, number][];
}

export type Shape = RectShape | CircleShape | LineShape | PolyShape;

// ─── Сетка и привязка ──────────────────────────────────────────────────

/** Шаг сетки, м (EDITOR.md) */
export const GRID = 0.5;
/** Шаг поворота при включённом магните, градусы */
export const ROT_STEP = 15;
/** Минимальный габарит объекта, м */
export const MIN_SIZE = 0.5;

/** Округление до сотых — гасит плавающий шум, 1 см точности достаточно. */
export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Привязка значения к шагу сетки. */
export function snap(v: number, step: number = GRID): number {
  return round2(Math.round(v / step) * step);
}

/** Нормализация угла в [0, 360). */
export function normalizeAngle(deg: number): number {
  const a = deg % 360;
  return a < 0 ? a + 360 : a;
}

/** Привязка угла к шагу (15° по умолчанию). */
export function snapAngle(deg: number, step: number = ROT_STEP): number {
  return normalizeAngle(Math.round(deg / step) * step);
}

// ─── Прямоугольник ─────────────────────────────────────────────────────

const DEG = Math.PI / 180;

/** Четыре угла прямоугольника с учётом поворота (по часовой от левого верхнего). */
export function rectCorners(r: RectShape): [number, number][] {
  const cos = Math.cos(r.rot * DEG);
  const sin = Math.sin(r.rot * DEG);
  const hw = r.w / 2;
  const hh = r.h / 2;
  const local: [number, number][] = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ];
  return local.map(([lx, ly]) => [
    round2(r.cx + lx * cos - ly * sin),
    round2(r.cy + lx * sin + ly * cos),
  ]);
}

/**
 * Привязка позиции прямоугольника при переносе.
 * При повороте, кратном 90°, к сетке идёт УГОЛ (габарит 2,5 м встанет
 * углом на линию сетки); при прочих углах — центр (углы всё равно
 * не лягут на сетку).
 */
export function snapRectPosition(r: RectShape, grid: number = GRID): RectShape {
  const rot = normalizeAngle(r.rot);
  if (rot % 90 === 0) {
    // Габариты в осях листа: при 90/270 ширина и глубина меняются местами
    const swap = rot % 180 !== 0;
    const w = swap ? r.h : r.w;
    const h = swap ? r.w : r.h;
    const minX = snap(r.cx - w / 2, grid);
    const minY = snap(r.cy - h / 2, grid);
    return { ...r, cx: round2(minX + w / 2), cy: round2(minY + h / 2) };
  }
  return { ...r, cx: snap(r.cx, grid), cy: snap(r.cy, grid) };
}

/** Ручки растяжения прямоугольника — четыре угла в локальных осях. */
export type RectHandle = 'nw' | 'ne' | 'se' | 'sw';

/**
 * Растяжение прямоугольника за угол: противоположный угол закреплён,
 * тянущийся идёт за точкой point (мировые координаты), габариты
 * привязываются к шагу сетки. Возвращает новый прямоугольник.
 */
export function resizeRect(
  r: RectShape,
  handle: RectHandle,
  point: Vec,
  snapOn: boolean,
  grid: number = GRID,
): RectShape {
  const cos = Math.cos(r.rot * DEG);
  const sin = Math.sin(r.rot * DEG);
  // Точка указателя в локальной системе (центр прямоугольника, без поворота)
  const dx = point.x - r.cx;
  const dy = point.y - r.cy;
  const lx = dx * cos + dy * sin;
  const ly = -dx * sin + dy * cos;

  // Закреплённый угол в локальных координатах
  const sx = handle === 'ne' || handle === 'se' ? -1 : 1; // знак фиксированного X
  const sy = handle === 'se' || handle === 'sw' ? -1 : 1; // знак фиксированного Y
  const fixedX = (sx * r.w) / 2;
  const fixedY = (sy * r.h) / 2;

  let w = Math.abs(lx - fixedX);
  let h = Math.abs(ly - fixedY);
  if (snapOn) {
    w = snap(w, grid);
    h = snap(h, grid);
  }
  w = Math.max(MIN_SIZE, round2(w));
  h = Math.max(MIN_SIZE, round2(h));

  // Новый центр: от закреплённого угла на полгабарита к тянущемуся
  const ncxL = fixedX - (sx * w) / 2;
  const ncyL = fixedY - (sy * h) / 2;
  return {
    ...r,
    w,
    h,
    cx: round2(r.cx + ncxL * cos - ncyL * sin),
    cy: round2(r.cy + ncxL * sin + ncyL * cos),
  };
}

/** Ручки-кромки прямоугольника: тянут одну стену, противоположная стоит. */
export type RectEdge = 'n' | 'e' | 's' | 'w';

/**
 * Растяжение прямоугольника за кромку: указатель тянет одну стену вдоль
 * её нормали, противоположная стена закреплена. Для дома интуитивнее
 * угловых ручек — «раздвинуть стену».
 */
export function resizeRectEdge(
  r: RectShape,
  edge: RectEdge,
  point: Vec,
  snapOn: boolean,
  grid: number = GRID,
): RectShape {
  const cos = Math.cos(r.rot * DEG);
  const sin = Math.sin(r.rot * DEG);
  const dx = point.x - r.cx;
  const dy = point.y - r.cy;
  const lx = dx * cos + dy * sin;
  const ly = -dx * sin + dy * cos;

  const horizontal = edge === 'e' || edge === 'w';
  const sign = edge === 'e' || edge === 's' ? 1 : -1;
  const fixed = horizontal ? (-sign * r.w) / 2 : (-sign * r.h) / 2;
  const pointer = horizontal ? lx : ly;

  let size = Math.abs(pointer - fixed);
  if (snapOn) size = snap(size, grid);
  size = Math.max(MIN_SIZE, round2(size));

  const centerL = fixed + (sign * size) / 2;
  const ncxL = horizontal ? centerL : 0;
  const ncyL = horizontal ? 0 : centerL;
  return {
    ...r,
    w: horizontal ? size : r.w,
    h: horizontal ? r.h : size,
    cx: round2(r.cx + ncxL * cos - ncyL * sin),
    cy: round2(r.cy + ncxL * sin + ncyL * cos),
  };
}

/** Растяжение круга: радиус — расстояние до указателя, диаметр по сетке. */
export function resizeCircle(
  c: CircleShape,
  point: Vec,
  snapOn: boolean,
  grid: number = GRID,
): CircleShape {
  let d = Math.hypot(point.x - c.cx, point.y - c.cy) * 2;
  if (snapOn) d = snap(d, grid);
  d = Math.max(MIN_SIZE, d);
  return { ...c, r: round2(d / 2) };
}

/** Перенос вершины ломаной на точку (с привязкой к сетке). */
export function moveLineVertex(
  l: LineShape,
  index: number,
  point: Vec,
  snapOn: boolean,
  grid: number = GRID,
): LineShape {
  const x = snapOn ? snap(point.x, grid) : round2(point.x);
  const y = snapOn ? snap(point.y, grid) : round2(point.y);
  const pts = l.pts.map((p, i) => (i === index ? ([x, y] as [number, number]) : p));
  return { ...l, pts };
}

/** Угол поворота из позиции указателя относительно центра (ручка сверху = 0°). */
export function rotationFromPointer(center: Vec, point: Vec): number {
  return normalizeAngle(
    (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI + 90,
  );
}

// ─── Общие операции над формами ────────────────────────────────────────

export function moveShape<S extends Shape>(shape: S, dx: number, dy: number): S {
  switch (shape.kind) {
    case 'rect':
    case 'circle':
      return { ...shape, cx: round2(shape.cx + dx), cy: round2(shape.cy + dy) };
    case 'line':
    case 'poly':
      return {
        ...shape,
        pts: shape.pts.map(([x, y]) => [round2(x + dx), round2(y + dy)]),
      };
  }
}

/** Привязка формы к сетке после переноса. */
export function snapShapePosition<S extends Shape>(shape: S, grid: number = GRID): S {
  switch (shape.kind) {
    case 'rect':
      return snapRectPosition(shape, grid) as S;
    case 'circle':
      return { ...shape, cx: snap(shape.cx, grid), cy: snap(shape.cy, grid) };
    case 'line':
    case 'poly': {
      // Ломаную/полигон двигаем целиком: привязываем первую вершину,
      // остальные сдвигаются на тот же вектор — форма не искажается.
      const [fx, fy] = shape.pts[0];
      const dx = snap(fx, grid) - fx;
      const dy = snap(fy, grid) - fy;
      if (dx === 0 && dy === 0) return shape;
      return moveShape(shape, dx, dy);
    }
  }
}

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function shapeBBox(shape: Shape): BBox {
  let pts: [number, number][];
  switch (shape.kind) {
    case 'rect':
      pts = rectCorners(shape);
      break;
    case 'circle':
      return {
        minX: shape.cx - shape.r,
        minY: shape.cy - shape.r,
        maxX: shape.cx + shape.r,
        maxY: shape.cy + shape.r,
      };
    case 'line': {
      const half = shape.width / 2;
      const xs = shape.pts.map((p) => p[0]);
      const ys = shape.pts.map((p) => p[1]);
      return {
        minX: Math.min(...xs) - half,
        minY: Math.min(...ys) - half,
        maxX: Math.max(...xs) + half,
        maxY: Math.max(...ys) + half,
      };
    }
    case 'poly':
      pts = shape.pts;
      break;
  }
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

export function shapeCenter(shape: Shape): Vec {
  switch (shape.kind) {
    case 'rect':
    case 'circle':
      return { x: shape.cx, y: shape.cy };
    default: {
      const b = shapeBBox(shape);
      return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
    }
  }
}

// ─── Контуры (points для PocketBase и SVG) ─────────────────────────────

/** Сегментов в аппроксимации круга 24 — гладко и дёшево. */
const CIRCLE_SEGMENTS = 24;

/** Контур круга — правильный 24-угольник. */
export function circleOutline(c: CircleShape): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
    const a = (i / CIRCLE_SEGMENTS) * 2 * Math.PI;
    pts.push([round2(c.cx + c.r * Math.cos(a)), round2(c.cy + c.r * Math.sin(a))]);
  }
  return pts;
}

/**
 * Контур ломаной с шириной: обе стороны осевой линии, смещённые на
 * width/2 (усреднённые нормали в стыках), плоские торцы. Достаточно для
 * дорожек/изгородей с вершинами на сетке.
 */
export function lineOutline(l: LineShape): [number, number][] {
  const { pts, width } = l;
  if (pts.length === 0) return [];
  const half = width / 2;
  if (pts.length === 1) {
    const [x, y] = pts[0];
    return [
      [round2(x - half), round2(y - half)],
      [round2(x + half), round2(y - half)],
      [round2(x + half), round2(y + half)],
      [round2(x - half), round2(y + half)],
    ];
  }

  // Нормали сегментов
  const normals: Vec[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0];
    const dy = pts[i + 1][1] - pts[i][1];
    const len = Math.hypot(dx, dy) || 1;
    normals.push({ x: -dy / len, y: dx / len });
  }

  // Нормаль в вершине — среднее соседних сегментов (митра, ограниченная 3×)
  const offset = (i: number): Vec => {
    const n1 = normals[Math.max(0, i - 1)];
    const n2 = normals[Math.min(normals.length - 1, i)];
    let nx = n1.x + n2.x;
    let ny = n1.y + n2.y;
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    // Компенсация укорочения митры: 1/cos(θ/2), ограничена 3
    const dot = n1.x * nx + n1.y * ny;
    const miter = Math.min(3, 1 / Math.max(0.34, Math.abs(dot)));
    return { x: nx * half * miter, y: ny * half * miter };
  };

  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) {
    const o = offset(i);
    left.push([round2(pts[i][0] + o.x), round2(pts[i][1] + o.y)]);
    right.push([round2(pts[i][0] - o.x), round2(pts[i][1] - o.y)]);
  }
  return [...left, ...right.reverse()];
}

/** Контур формы — замкнутый многоугольник (для PB `points` и SVG). */
export function shapeOutline(shape: Shape): [number, number][] {
  switch (shape.kind) {
    case 'rect':
      return rectCorners(shape);
    case 'circle':
      return circleOutline(shape);
    case 'line':
      return lineOutline(shape);
    case 'poly':
      return shape.pts;
  }
}

// ─── Хит-тесты ─────────────────────────────────────────────────────────

export function pointInPolygon(p: Vec, pts: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Попадание точки в форму (для подсказок по зонам; клики ловит SVG сам). */
export function pointInShape(p: Vec, shape: Shape): boolean {
  switch (shape.kind) {
    case 'circle':
      return Math.hypot(p.x - shape.cx, p.y - shape.cy) <= shape.r;
    default:
      return pointInPolygon(p, shapeOutline(shape));
  }
}

// ─── Распознавание прямоугольника в старых полигонах ───────────────────

/**
 * Полигон из 4 точек с равными диагоналями и прямыми углами → RectShape.
 * Возвращает null, если это не прямоугольник (допуск 2 см / ~1°).
 */
export function rectFromPolygon(pts: number[][]): RectShape | null {
  if (pts.length !== 4) return null;
  const [a, b, c, d] = pts as [number, number][];
  const edge = (p: number[], q: number[]) => ({ x: q[0] - p[0], y: q[1] - p[1] });
  const ab = edge(a, b);
  const bc = edge(b, c);
  const cd = edge(c, d);
  const da = edge(d, a);
  const len = (v: Vec) => Math.hypot(v.x, v.y);
  const tol = 0.02;
  // Противоположные стороны равны
  if (Math.abs(len(ab) - len(cd)) > tol || Math.abs(len(bc) - len(da)) > tol) return null;
  // Прямые углы: скалярное произведение соседних сторон ≈ 0
  const dot = (u: Vec, v: Vec) => u.x * v.x + u.y * v.y;
  const maxSide = Math.max(len(ab), len(bc));
  if (Math.abs(dot(ab, bc)) > tol * maxSide * 2) return null;
  if (len(ab) < 0.01 || len(bc) < 0.01) return null;

  const rot = normalizeAngle((Math.atan2(ab.y, ab.x) * 180) / Math.PI);
  return {
    kind: 'rect',
    cx: round2((a[0] + c[0]) / 2),
    cy: round2((a[1] + c[1]) / 2),
    w: round2(len(ab)),
    h: round2(len(bc)),
    rot: Math.round(rot * 10) / 10,
  };
}
