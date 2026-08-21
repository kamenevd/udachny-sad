/**
 * Умные направляющие (как в Figma): при переносе объект прилипает
 * к краям и центрам соседей и самого участка, место прилипания
 * показывается красной линией.
 *
 * Работают ВМЕСТЕ с сеткой: по каждой оси сначала ищется направляющая
 * (точнее сетки — совпадение с соседом важнее круглого числа), если её
 * нет — включается привязка к сетке (когда магнит включён).
 */

import {
  type Shape,
  type BBox,
  shapeBBox,
  moveShape,
  snapShapePosition,
  round2,
  GRID,
} from './geometry';

export interface GuideLine {
  axis: 'x' | 'y';
  /** Мировая координата линии (x для вертикальной, y для горизонтальной) */
  at: number;
  /** Отрезок для отрисовки — покрывает оба объекта */
  from: number;
  to: number;
}

/** Кандидаты прилипания одного bbox по оси: край / центр / край. */
function edges(b: BBox, axis: 'x' | 'y'): number[] {
  return axis === 'x'
    ? [b.minX, (b.minX + b.maxX) / 2, b.maxX]
    : [b.minY, (b.minY + b.maxY) / 2, b.maxY];
}

interface AxisSnap {
  delta: number;
  at: number;
  target: BBox;
}

function snapAxis(moving: BBox, targets: BBox[], axis: 'x' | 'y', threshold: number): AxisSnap | null {
  const own = edges(moving, axis);
  let best: AxisSnap | null = null;
  for (const t of targets) {
    for (const ta of edges(t, axis)) {
      for (const oa of own) {
        const delta = ta - oa;
        if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) {
          best = { delta, at: ta, target: t };
        }
      }
    }
  }
  return best;
}

function span(a: BBox, b: BBox, axis: 'x' | 'y'): [number, number] {
  return axis === 'x'
    ? [Math.min(a.minY, b.minY), Math.max(a.maxY, b.maxY)]
    : [Math.min(a.minX, b.minX), Math.max(a.maxX, b.maxX)];
}

export interface MovePlan {
  shape: Shape;
  guides: GuideLine[];
}

/**
 * Итог переноса: start + (rawDx, rawDy), затем прилипание.
 *
 * По каждой оси независимо: направляющая (в пределах threshold) →
 * иначе сетка (если magnet). Сетка применяется через snapShapePosition,
 * то есть у прямоугольника под 90° к сетке идёт угол, у прочих — центр.
 */
export function planMove(
  start: Shape,
  rawDx: number,
  rawDy: number,
  opts: {
    /** bbox соседей + сам участок (его края и центр тоже магнитят) */
    targets: BBox[];
    magnet: boolean;
    /** Порог прилипания направляющих в метрах (≈8 px / scale) */
    guideThreshold: number;
    grid?: number;
  },
): MovePlan {
  const moved = moveShape(start, rawDx, rawDy);
  const bbox = shapeBBox(moved);

  const gx = snapAxis(bbox, opts.targets, 'x', opts.guideThreshold);
  const gy = snapAxis(bbox, opts.targets, 'y', opts.guideThreshold);

  // Дельты сетки по каждой оси — из полностью привязанной копии
  let gridDx = 0;
  let gridDy = 0;
  if (opts.magnet) {
    const snapped = shapeBBox(snapShapePosition(moved, opts.grid ?? GRID));
    gridDx = snapped.minX - bbox.minX;
    gridDy = snapped.minY - bbox.minY;
  }

  const dx = gx ? gx.delta : gridDx;
  const dy = gy ? gy.delta : gridDy;

  const shape = dx === 0 && dy === 0 ? moved : moveShape(moved, dx, dy);
  const finalBox = shapeBBox(shape);

  const guides: GuideLine[] = [];
  if (gx) {
    const [from, to] = span(finalBox, gx.target, 'x');
    guides.push({ axis: 'x', at: round2(gx.at), from, to });
  }
  if (gy) {
    const [from, to] = span(finalBox, gy.target, 'y');
    guides.push({ axis: 'y', at: round2(gy.at), from, to });
  }
  return { shape, guides };
}

/** bbox участка от (0,0) до (w,h) — края и центр участвуют в прилипании. */
export function plotBBox(plotW: number, plotH: number): BBox {
  return { minX: 0, minY: 0, maxX: plotW, maxY: plotH };
}
