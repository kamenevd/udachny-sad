/**
 * Вьюпорт редактора: мировые координаты (метры листа) ⇄ экранные пиксели.
 *
 * screen = world * scale + t. Чистые функции — зум к точке, панорама,
 * пинч двумя пальцами и вписывание участка считаются здесь и покрыты
 * юнит-тестами; компонент канвы только хранит текущий Viewport.
 */

import type { Vec } from './geometry';

export interface Viewport {
  /** Пикселей на метр */
  scale: number;
  tx: number;
  ty: number;
}

/** Максимальный зум: 250 px/м — виден каждый сантиметр. */
export const MAX_SCALE = 250;
/** Минимальный зум: 2 px/м — участок 100 м умещается в ладонь. */
export const MIN_SCALE = 2;

export function worldToScreen(vp: Viewport, p: Vec): Vec {
  return { x: p.x * vp.scale + vp.tx, y: p.y * vp.scale + vp.ty };
}

export function screenToWorld(vp: Viewport, p: Vec): Vec {
  return { x: (p.x - vp.tx) / vp.scale, y: (p.y - vp.ty) / vp.scale };
}

export function panBy(vp: Viewport, dxPx: number, dyPx: number): Viewport {
  return { ...vp, tx: vp.tx + dxPx, ty: vp.ty + dyPx };
}

function clampScale(s: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}

/** Зум с неподвижной точкой pivot (экранные px) — колесо и двойной тап. */
export function zoomAt(vp: Viewport, pivot: Vec, factor: number): Viewport {
  const scale = clampScale(vp.scale * factor);
  const k = scale / vp.scale;
  return {
    scale,
    tx: pivot.x - (pivot.x - vp.tx) * k,
    ty: pivot.y - (pivot.y - vp.ty) * k,
  };
}

/**
 * Пинч: два пальца были в a1/b1, стали в a2/b2 (экранные px).
 * Масштаб меняется по отношению расстояний, середина следует за пальцами —
 * это одновременно и зум, и панорама (как в картах).
 */
export function pinch(vp: Viewport, a1: Vec, b1: Vec, a2: Vec, b2: Vec): Viewport {
  const d1 = Math.hypot(b1.x - a1.x, b1.y - a1.y) || 1;
  const d2 = Math.hypot(b2.x - a2.x, b2.y - a2.y) || 1;
  const scale = clampScale(vp.scale * (d2 / d1));
  const k = scale / vp.scale;
  const m1 = { x: (a1.x + b1.x) / 2, y: (a1.y + b1.y) / 2 };
  const m2 = { x: (a2.x + b2.x) / 2, y: (a2.y + b2.y) / 2 };
  return {
    scale,
    tx: m2.x - (m1.x - vp.tx) * k,
    ty: m2.y - (m1.y - vp.ty) * k,
  };
}

/** Вписать участок plotW×plotH (м) в окно viewW×viewH (px) с полями. */
export function fitPlot(
  plotW: number,
  plotH: number,
  viewW: number,
  viewH: number,
  paddingPx = 24,
): Viewport {
  const availW = Math.max(50, viewW - paddingPx * 2);
  const availH = Math.max(50, viewH - paddingPx * 2);
  const scale = clampScale(Math.min(availW / plotW, availH / plotH));
  return {
    scale,
    tx: (viewW - plotW * scale) / 2,
    ty: (viewH - plotH * scale) / 2,
  };
}

/**
 * Не дать участку улететь за экран: минимум margin px листа остаётся
 * видно с каждой стороны. Вызывается после каждой панорамы/зума.
 */
export function clampToPlot(
  vp: Viewport,
  plotW: number,
  plotH: number,
  viewW: number,
  viewH: number,
  margin = 64,
): Viewport {
  const wPx = plotW * vp.scale;
  const hPx = plotH * vp.scale;
  let { tx, ty } = vp;
  // Правый край листа не левее margin; левый — не правее viewW - margin
  tx = Math.max(margin - wPx, Math.min(viewW - margin, tx));
  ty = Math.max(margin - hPx, Math.min(viewH - margin, ty));
  if (tx === vp.tx && ty === vp.ty) return vp;
  return { ...vp, tx, ty };
}
