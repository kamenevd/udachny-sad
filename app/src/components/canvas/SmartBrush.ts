/**
 * SmartBrush — «умная кисть» для рисования клумб/композиций (PLAN9 задача I.2).
 *
 * Садовод рисует клумбу пальцем «от руки» — неровный замкнутый контур.
 * Кисть накапливает точки штриха и «примагничивает» их к аккуратному
 * прямоугольнику: находим минимальный по площади ограничивающий прямоугольник
 * (может быть повёрнут — клумбы и композиции не всегда параллельны краю участка) и
 * возвращаем его 4 угла. Для людей с низкой точностью пальца это превращает
 * дрожащую петлю в ровную клумбу в один жест.
 *
 * Координаты — в метрах (как `geometry.points` в `SchemaObject`), чтобы
 * результат сразу шёл в `useDrawObject`-совместимый polygon.
 */

export type Point = [number, number];

export interface SnapResult {
  /** 4 угла прямоугольника (CCW), метры, округлены до сантиметра */
  points: Point[];
  /** Угол поворота длинной стороны, градусы (для отладки/подсказки) */
  angleDeg: number;
  /** Был ли штрих замкнутым (конец рядом с началом) */
  closed: boolean;
}

const round2 = (v: number): number => Math.round(v * 100) / 100;

/** Периметр-независимая мера размаха штриха — диагональ его bbox. */
function bboxDiagonal(points: Point[]): number {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return Math.hypot(maxX - minX, maxY - minY);
}

/**
 * Прорежает штрих: выкидывает точки ближе `minGapM` к предыдущей,
 * чтобы убрать дрожание пальца и ускорить построение оболочки.
 */
export function simplifyStroke(points: Point[], minGapM = 0.05): Point[] {
  if (points.length === 0) return [];
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const [px, py] = out[out.length - 1];
    const [x, y] = points[i];
    if (Math.hypot(x - px, y - py) >= minGapM) out.push(points[i]);
  }
  return out;
}

/** Замкнут ли штрих: конец в пределах `tol`·диагонали от начала. */
export function strokeIsClosed(points: Point[], tol = 0.25): boolean {
  if (points.length < 3) return false;
  const diag = bboxDiagonal(points);
  if (diag === 0) return false;
  const [sx, sy] = points[0];
  const [ex, ey] = points[points.length - 1];
  return Math.hypot(ex - sx, ey - sy) <= tol * diag;
}

/** Выпуклая оболочка (обход Эндрю, против часовой стрелки, без дубля концов). */
export function convexHull(points: Point[]): Point[] {
  const uniq = Array.from(
    new Map(points.map((p) => [`${p[0]},${p[1]}`, p])).values(),
  ).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (uniq.length < 3) return uniq;

  const cross = (o: Point, a: Point, b: Point) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

  const lower: Point[] = [];
  for (const p of uniq) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper: Point[] = [];
  for (let i = uniq.length - 1; i >= 0; i--) {
    const p = uniq[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

/**
 * Минимальный по площади ограничивающий прямоугольник (rotating calipers по
 * рёбрам оболочки). Возвращает 4 угла и угол поворота длинной стороны.
 */
export function minAreaRect(points: Point[]): { corners: Point[]; angleDeg: number } {
  const hull = convexHull(points);
  if (hull.length < 3) {
    // Вырожденный штрих — отдаём axis-aligned bbox.
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of points) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    return {
      corners: [
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
      ],
      angleDeg: 0,
    };
  }

  let best: { area: number; corners: Point[]; angle: number } | null = null;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i];
    const b = hull[(i + 1) % hull.length];
    const edgeAngle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const cos = Math.cos(-edgeAngle);
    const sin = Math.sin(-edgeAngle);

    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const [x, y] of hull) {
      const u = x * cos - y * sin;
      const v = x * sin + y * cos;
      minU = Math.min(minU, u);
      maxU = Math.max(maxU, u);
      minV = Math.min(minV, v);
      maxV = Math.max(maxV, v);
    }
    const area = (maxU - minU) * (maxV - minV);
    if (!best || area < best.area) {
      // Углы в повёрнутой системе → назад в исходную.
      const back = (u: number, v: number): Point => [
        u * cos + v * sin,
        -u * sin + v * cos,
      ];
      best = {
        area,
        corners: [back(minU, minV), back(maxU, minV), back(maxU, maxV), back(minU, maxV)],
        angle: edgeAngle,
      };
    }
  }

  const b = best!;
  let angleDeg = (b.angle * 180) / Math.PI;
  // Нормализуем в диапазон (-90, 90].
  while (angleDeg > 90) angleDeg -= 180;
  while (angleDeg <= -90) angleDeg += 180;
  return { corners: b.corners, angleDeg };
}

/**
 * Главная функция: превращает штрих «от руки» в прямоугольную клумбу/композицию.
 * Возвращает `null`, если точек слишком мало для осмысленной фигуры.
 */
export function snapToRectangle(
  rawPoints: Point[],
  opts: { minGapM?: number; closeTol?: number } = {},
): SnapResult | null {
  const pts = simplifyStroke(rawPoints, opts.minGapM);
  if (pts.length < 3 || bboxDiagonal(pts) < 0.1) return null;

  const closed = strokeIsClosed(pts, opts.closeTol);
  const { corners, angleDeg } = minAreaRect(pts);
  return {
    points: corners.map(([x, y]): Point => [round2(x), round2(y)]),
    angleDeg: round2(angleDeg),
    closed,
  };
}

/**
 * Кисть с накоплением точек — для покадрового рисования пальцем.
 * Стейт минимален: массив точек штриха. UI зовёт `add` на pointermove
 * и `snap()` на pointerup.
 */
export class SmartBrush {
  private stroke: Point[] = [];

  constructor(private readonly opts: { minGapM?: number; closeTol?: number } = {}) {}

  /** Начать новый штрих (сбрасывает накопленное). */
  begin(x: number, y: number): void {
    this.stroke = [[x, y]];
  }

  /** Добавить точку по движению пальца. */
  add(x: number, y: number): void {
    this.stroke.push([x, y]);
  }

  /** Сырые точки текущего штриха (для превью «от руки»). */
  get points(): Point[] {
    return this.stroke;
  }

  /** Завершить штрих и получить прямоугольник (или `null`). */
  snap(): SnapResult | null {
    const result = snapToRectangle(this.stroke, this.opts);
    this.stroke = [];
    return result;
  }

  /** Отменить текущий штрих без снапа. */
  reset(): void {
    this.stroke = [];
  }
}
