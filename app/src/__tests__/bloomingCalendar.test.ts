/**
 * PLAN12 задача 15 — календарь цветения: фильтрация по месяцам
 * (useBloomingSeasons) и подсветка объектов на канвасе (computeBloomStates).
 */

import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  bloomMonthsOf, bloomsIn, useBloomingSeasons,
} from '../hooks/useBloomingSeasons';
import { computeBloomStates } from '../components/canvas/bloomOverlay';
import type { Plant } from '../lib/pb';

/** Растение-заглушка: тесту нужны только bloom_months/primary_color */
function plant(id: string, fields: Partial<Plant> = {}): Plant {
  return {
    id,
    name: id,
    userId: 'u1',
    plantType: 'perennial',
    collectionId: 'plants',
    collectionName: 'plants',
    ...fields,
  } as Plant;
}

describe('bloomMonthsOf', () => {
  it('возвращает месяцы как есть', () => {
    expect(bloomMonthsOf(plant('a', { bloom_months: [6, 7, 8] }))).toEqual([6, 7, 8]);
  });

  it('пусто, если поле не заполнено (хвойные)', () => {
    expect(bloomMonthsOf(plant('a'))).toEqual([]);
    expect(bloomMonthsOf(plant('a', { bloom_months: [] }))).toEqual([]);
  });

  it('отсеивает мусор из json — не числа и месяцы вне 1-12', () => {
    const dirty = plant('a', {
      bloom_months: [0, 6, 13, -1, 7.5, 'июнь', null] as unknown as number[],
    });
    expect(bloomMonthsOf(dirty)).toEqual([6]);
  });
});

describe('bloomsIn', () => {
  it('определяет цветение в месяце', () => {
    const phlox = plant('phlox', { bloom_months: [7, 8, 9] });
    expect(bloomsIn(phlox, 7)).toBe(true);
    expect(bloomsIn(phlox, 5)).toBe(false);
  });

  it('хвойные не цветут никогда', () => {
    const thuja = plant('thuja', { bloom_months: [] });
    for (let m = 1; m <= 12; m += 1) expect(bloomsIn(thuja, m)).toBe(false);
  });
});

describe('useBloomingSeasons', () => {
  const plants = [
    plant('phlox', { bloom_months: [7, 8, 9] }),
    plant('tulip', { bloom_months: [4, 5] }),
    plant('thuja', { bloom_months: [] }),
  ];

  it('без выбранного месяца возвращает весь список', () => {
    const { result } = renderHook(() => useBloomingSeasons(plants, null));
    expect(result.current.filtered).toHaveLength(3);
    expect(result.current.isBlooming(plants[0])).toBe(false);
  });

  it('фильтрует по выбранному месяцу', () => {
    const { result } = renderHook(() => useBloomingSeasons(plants, 8));
    expect(result.current.filtered.map((p) => p.id)).toEqual(['phlox']);
    expect(result.current.isBlooming(plants[0])).toBe(true);
    expect(result.current.isBlooming(plants[2])).toBe(false);
  });

  it('в месяц без цветения выдаёт пустой список', () => {
    const { result } = renderHook(() => useBloomingSeasons(plants, 1));
    expect(result.current.filtered).toEqual([]);
  });

  it('считает растения по месяцам', () => {
    const { result } = renderHook(() => useBloomingSeasons(plants, null));
    const { countByMonth } = result.current;
    expect(countByMonth[3]).toBe(1); // апрель — тюльпан
    expect(countByMonth[6]).toBe(1); // июль — флокс
    expect(countByMonth[0]).toBe(0); // январь — пусто
    expect(countByMonth).toHaveLength(12);
  });

  it('дубли месяцев в json не считаются дважды', () => {
    const { result } = renderHook(() =>
      useBloomingSeasons([plant('x', { bloom_months: [6, 6, 6] })], null),
    );
    expect(result.current.countByMonth[5]).toBe(1);
  });

  it('hasBloomData различает справочник без сезонности', () => {
    const noData = renderHook(() => useBloomingSeasons([plant('thuja')], null));
    expect(noData.result.current.hasBloomData).toBe(false);

    const withData = renderHook(() => useBloomingSeasons(plants, null));
    expect(withData.result.current.hasBloomData).toBe(true);
  });

  it('переживает undefined (справочник ещё грузится)', () => {
    const { result } = renderHook(() => useBloomingSeasons(undefined, 6));
    expect(result.current.filtered).toEqual([]);
    expect(result.current.hasBloomData).toBe(false);
  });
});

describe('computeBloomStates', () => {
  const phlox = plant('phlox', { bloom_months: [7, 8], primary_color: '#E86A9A' });
  const thuja = plant('thuja', { bloom_months: [], primary_color: '#3E7B3A' });

  it('без выбранного месяца состояний нет — канвас в обычном режиме', () => {
    const states = computeBloomStates([{ schemaObjectId: 'bed1', plant: phlox }], null);
    expect(states.size).toBe(0);
  });

  it('отмечает цветущий объект цветом растения', () => {
    const states = computeBloomStates([{ schemaObjectId: 'bed1', plant: phlox }], 7);
    expect(states.get('bed1')).toEqual({
      color: '#E86A9A',
      blooming: true,
      bloomingCount: 1,
    });
  });

  it('нецветущий объект остаётся без цвета — он приглушается', () => {
    const states = computeBloomStates([{ schemaObjectId: 'bed1', plant: phlox }], 5);
    expect(states.get('bed1')).toMatchObject({ color: null, blooming: false });
  });

  it('на смешанном месте цвет берётся у цветущего растения', () => {
    const states = computeBloomStates(
      [
        { schemaObjectId: 'bed1', plant: thuja },
        { schemaObjectId: 'bed1', plant: phlox },
      ],
      8,
    );
    expect(states.get('bed1')).toEqual({
      color: '#E86A9A',
      blooming: true,
      bloomingCount: 1,
    });
  });

  it('посадки без места схемы пропускаются', () => {
    const states = computeBloomStates([{ plant: phlox }], 7);
    expect(states.size).toBe(0);
  });
});
