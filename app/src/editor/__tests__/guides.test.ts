/**
 * Тесты умных направляющих: прилипание к краям/центрам соседей и участка,
 * приоритет направляющей над сеткой, независимость осей.
 */

import { describe, it, expect } from 'vitest';
import { planMove, plotBBox } from '../guides';
import { shapeBBox, type RectShape } from '../geometry';

const house: RectShape = { kind: 'rect', cx: 5, cy: 5, w: 6, h: 4, rot: 0 };

describe('planMove: сетка', () => {
  it('с магнитом без соседей — угол на сетке', () => {
    const { shape, guides } = planMove(house, 0.13, 0.22, {
      targets: [],
      magnet: true,
      guideThreshold: 0.1,
    });
    const box = shapeBBox(shape);
    expect(box.minX % 0.5).toBe(0);
    expect(box.minY % 0.5).toBe(0);
    expect(guides).toHaveLength(0);
  });

  it('без магнита и направляющих — свободный перенос', () => {
    const { shape } = planMove(house, 0.13, 0.22, {
      targets: [],
      magnet: false,
      guideThreshold: 0.001,
    });
    expect(shapeBBox(shape).minX).toBeCloseTo(2.13, 2);
  });
});

describe('planMove: направляющие', () => {
  it('край прилипает к краю соседа и даёт guide-линию', () => {
    // Сосед с левым краем x=10; наш правый край после сдвига — 10,07
    const neighbor = { minX: 10, minY: 0, maxX: 14, maxY: 2 };
    const { shape, guides } = planMove(house, 2.07, 0, {
      targets: [neighbor],
      magnet: false,
      guideThreshold: 0.1,
    });
    expect(shapeBBox(shape).maxX).toBe(10);
    const gx = guides.find((g) => g.axis === 'x');
    expect(gx?.at).toBe(10);
  });

  it('центр прилипает к центру соседа', () => {
    const neighbor = { minX: 8, minY: 10, maxX: 12, maxY: 12 }; // центр x=10
    const { shape, guides } = planMove(house, 5.06, 0, {
      targets: [neighbor],
      magnet: false,
      guideThreshold: 0.1,
    });
    expect(shapeBBox(shape).minX + 3).toBe(10); // центр дома на 10
    expect(guides.some((g) => g.axis === 'x' && g.at === 10)).toBe(true);
  });

  it('направляющая точнее сетки: побеждает направляющая', () => {
    // Сосед на x=10,2 (не на сетке); сдвигаем дом правым краем к 10,15
    const neighbor = { minX: 10.2, minY: 0, maxX: 12, maxY: 2 };
    const { shape } = planMove(house, 2.15, 0, {
      targets: [neighbor],
      magnet: true,
      guideThreshold: 0.1,
    });
    expect(shapeBBox(shape).maxX).toBe(10.2); // не 10 и не 10,5
  });

  it('оси независимы: по X направляющая, по Y сетка', () => {
    const neighbor = { minX: 10.2, minY: 20, maxX: 12, maxY: 22 };
    const { shape } = planMove(house, 2.15, 0.13, {
      targets: [neighbor],
      magnet: true,
      guideThreshold: 0.1,
    });
    const box = shapeBBox(shape);
    expect(box.maxX).toBe(10.2);
    expect(box.minY % 0.5).toBe(0);
  });

  it('края участка тоже магнитят (дом в угол участка)', () => {
    const plot = plotBBox(20, 30);
    const { shape, guides } = planMove(house, -1.95, -2.93, {
      targets: [plot],
      magnet: false,
      guideThreshold: 0.15,
    });
    const box = shapeBBox(shape);
    expect(box.minX).toBe(0);
    expect(box.minY).toBe(0);
    expect(guides).toHaveLength(2);
  });

  it('вне порога — направляющих нет', () => {
    const neighbor = { minX: 10, minY: 0, maxX: 14, maxY: 2 };
    const { guides } = planMove(house, 1.5, 0, {
      targets: [neighbor],
      magnet: false,
      guideThreshold: 0.1,
    });
    expect(guides).toHaveLength(0);
  });

  it('guide-линия покрывает оба объекта', () => {
    const neighbor = { minX: 10, minY: 10, maxX: 14, maxY: 12 };
    const { guides } = planMove(house, 2.05, 0, {
      targets: [neighbor],
      magnet: false,
      guideThreshold: 0.1,
    });
    const gx = guides.find((g) => g.axis === 'x')!;
    expect(gx.from).toBeLessThanOrEqual(3); // верх дома (y≈3)
    expect(gx.to).toBeGreaterThanOrEqual(12); // низ соседа
  });
});
