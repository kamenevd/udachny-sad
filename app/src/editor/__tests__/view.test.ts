/**
 * Тесты вьюпорта: преобразования координат, зум к точке, пинч,
 * вписывание участка, ограничение панорамы.
 */

import { describe, it, expect } from 'vitest';
import {
  worldToScreen,
  screenToWorld,
  zoomAt,
  pinch,
  fitPlot,
  panBy,
  clampToPlot,
  MAX_SCALE,
  MIN_SCALE,
  type Viewport,
} from '../view';

const vp: Viewport = { scale: 20, tx: 100, ty: 50 };

describe('преобразования', () => {
  it('world → screen → world — тождество', () => {
    const w = { x: 3.7, y: 8.2 };
    const s = worldToScreen(vp, w);
    expect(s).toEqual({ x: 174, y: 214 });
    const back = screenToWorld(vp, s);
    expect(back.x).toBeCloseTo(w.x, 10);
    expect(back.y).toBeCloseTo(w.y, 10);
  });

  it('панорама сдвигает только смещение', () => {
    const p = panBy(vp, 10, -20);
    expect(p).toEqual({ scale: 20, tx: 110, ty: 30 });
  });
});

describe('зум', () => {
  it('точка под курсором неподвижна', () => {
    const pivot = { x: 200, y: 150 };
    const before = screenToWorld(vp, pivot);
    const zoomed = zoomAt(vp, pivot, 1.5);
    const after = screenToWorld(zoomed, pivot);
    expect(after.x).toBeCloseTo(before.x, 10);
    expect(after.y).toBeCloseTo(before.y, 10);
    expect(zoomed.scale).toBe(30);
  });

  it('ограничен MIN/MAX', () => {
    expect(zoomAt(vp, { x: 0, y: 0 }, 1000).scale).toBe(MAX_SCALE);
    expect(zoomAt(vp, { x: 0, y: 0 }, 0.0001).scale).toBe(MIN_SCALE);
  });

  it('пинч: разведение пальцев ×2 удваивает масштаб, середина следует', () => {
    const a1 = { x: 100, y: 100 };
    const b1 = { x: 200, y: 100 };
    const a2 = { x: 50, y: 100 };
    const b2 = { x: 250, y: 100 };
    const next = pinch(vp, a1, b1, a2, b2);
    expect(next.scale).toBe(40);
    // Мировая точка, бывшая под серединой (150,100), осталась под (150,100)
    const wBefore = screenToWorld(vp, { x: 150, y: 100 });
    const wAfter = screenToWorld(next, { x: 150, y: 100 });
    expect(wAfter.x).toBeCloseTo(wBefore.x, 10);
    expect(wAfter.y).toBeCloseTo(wBefore.y, 10);
  });
});

describe('fitPlot', () => {
  it('участок 20×30 вписывается в 390×600 целиком с полями', () => {
    const f = fitPlot(20, 30, 390, 600, 24);
    // Влезает и по ширине, и по высоте
    expect(20 * f.scale).toBeLessThanOrEqual(390 - 47);
    expect(30 * f.scale).toBeLessThanOrEqual(600 - 47);
    // Центрирован
    expect(f.tx).toBeCloseTo((390 - 20 * f.scale) / 2, 6);
    expect(f.ty).toBeCloseTo((600 - 30 * f.scale) / 2, 6);
  });

  it('не зумит мельче MIN_SCALE', () => {
    const f = fitPlot(10000, 10000, 300, 300, 24);
    expect(f.scale).toBe(MIN_SCALE);
  });
});

describe('clampToPlot', () => {
  it('не даёт увести лист целиком за экран', () => {
    // Лист 20×30 при scale 20 → 400×600 px; уводим сильно влево-вверх
    const gone: Viewport = { scale: 20, tx: -10000, ty: -10000 };
    const c = clampToPlot(gone, 20, 30, 390, 600, 64);
    expect(c.tx).toBe(64 - 400);
    expect(c.ty).toBe(64 - 600);
  });

  it('в пределах — не трогает', () => {
    const ok: Viewport = { scale: 20, tx: 10, ty: 10 };
    expect(clampToPlot(ok, 20, 30, 390, 600, 64)).toBe(ok);
  });
});
