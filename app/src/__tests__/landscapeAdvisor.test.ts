/**
 * PLAN12 задача 15 — анализ схемы AI-советником: пустые зоны, несовместимость,
 * освещение, цветовые сочетания и провалы в цветении.
 */

import { describe, it, expect } from 'vitest';
import { analyzeLandscape } from '../hooks/useLandscapeAdvisor';
import type {
  AdvisorObject, AdvisorPlanting, AdvisorZone,
} from '../hooks/useLandscapeAdvisor';
import type { Plant } from '../lib/pb';

/** Квадратная клумба 0,0 - 10,10 — центр в (5,5) */
function bed(id: string, type = 'flowerbed', label?: string): AdvisorObject {
  return {
    id,
    type,
    label,
    geometry: { points: [[0, 0], [10, 0], [10, 10], [0, 10]] },
  };
}

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

function zone(condition: AdvisorZone['condition']): AdvisorZone {
  return { condition, geometry: { points: [[0, 0], [10, 0], [10, 10], [0, 10]] } };
}

/** Полный набор месяцев сезона — глушит совет про паузу в цветении */
const ALL_SEASON = [4, 5, 6, 7, 8, 9, 10];

describe('пустые зоны', () => {
  it('замечает клумбу без посадок', () => {
    const advice = analyzeLandscape({ objects: [bed('b1')], plantings: [] });
    const empty = advice.filter((a) => a.kind === 'empty_zone');
    expect(empty).toHaveLength(1);
    expect(empty[0].objectId).toBe('b1');
  });

  it('подсказка учитывает освещённость зоны', () => {
    const shady = analyzeLandscape({
      objects: [bed('b1')], plantings: [], lightZones: [zone('shade')],
    });
    expect(shady[0].text).toContain('хоста');

    const sunny = analyzeLandscape({
      objects: [bed('b1')], plantings: [], lightZones: [zone('sunny')],
    });
    expect(sunny[0].text).toContain('флоксы');
  });

  it('не ругается на строения и газоны — их не засаживают', () => {
    const advice = analyzeLandscape({
      objects: [bed('h1', 'building'), bed('l1', 'lawn')],
      plantings: [],
    });
    expect(advice.filter((a) => a.kind === 'empty_zone')).toEqual([]);
  });

  it('засаженная клумба из советов уходит', () => {
    const advice = analyzeLandscape({
      objects: [bed('b1')],
      plantings: [{ schemaObjectId: 'b1', plant: plant('p', { bloom_months: ALL_SEASON }) }],
    });
    expect(advice.filter((a) => a.kind === 'empty_zone')).toEqual([]);
  });
});

describe('несовместимые соседи', () => {
  const rose = plant('rose', {
    name: 'Роза', catalogId: 'rose-tea-hybrid', incompatible_ids: ['thuja-smaragd'],
    bloom_months: ALL_SEASON,
  });
  const thuja = plant('thuja', {
    name: 'Туя', catalogId: 'thuja-smaragd', bloom_months: [],
  });

  it('находит конфликт на одном месте', () => {
    const advice = analyzeLandscape({
      objects: [bed('b1')],
      plantings: [
        { schemaObjectId: 'b1', plant: rose },
        { schemaObjectId: 'b1', plant: thuja },
      ],
    });
    const clash = advice.filter((a) => a.kind === 'incompatible');
    expect(clash).toHaveLength(1);
    expect(clash[0].severity).toBe('warning');
    expect(clash[0].title).toContain('Роза');
    expect(clash[0].title).toContain('Туя');
  });

  it('работает и в обратную сторону — список ведёт только у одного из пары', () => {
    const thujaBlames = plant('thuja', {
      name: 'Туя', catalogId: 'thuja-smaragd', incompatible_ids: ['rose-tea-hybrid'],
    });
    const plainRose = plant('rose', {
      name: 'Роза', catalogId: 'rose-tea-hybrid', bloom_months: ALL_SEASON,
    });
    const advice = analyzeLandscape({
      objects: [bed('b1')],
      plantings: [
        { schemaObjectId: 'b1', plant: plainRose },
        { schemaObjectId: 'b1', plant: thujaBlames },
      ],
    });
    expect(advice.filter((a) => a.kind === 'incompatible')).toHaveLength(1);
  });

  it('на разных местах конфликта нет', () => {
    const advice = analyzeLandscape({
      objects: [bed('b1'), bed('b2')],
      plantings: [
        { schemaObjectId: 'b1', plant: rose },
        { schemaObjectId: 'b2', plant: thuja },
      ],
    });
    expect(advice.filter((a) => a.kind === 'incompatible')).toEqual([]);
  });
});

describe('освещение', () => {
  it('предупреждает о светолюбивом растении в тени', () => {
    const advice = analyzeLandscape({
      objects: [bed('b1')],
      plantings: [
        {
          schemaObjectId: 'b1',
          plant: plant('rose', {
            name: 'Роза', sun_exposure: 'full_sun', bloom_months: ALL_SEASON,
          }),
        },
      ],
      lightZones: [zone('shade')],
    });
    const light = advice.filter((a) => a.kind === 'light_mismatch');
    expect(light).toHaveLength(1);
    expect(light[0].severity).toBe('warning');
    expect(light[0].text).toContain('нужно солнце');
  });

  it('предупреждает о тенелюбивом на открытом солнце', () => {
    const advice = analyzeLandscape({
      objects: [bed('b1')],
      plantings: [
        {
          schemaObjectId: 'b1',
          plant: plant('hosta', {
            name: 'Хоста', sun_exposure: 'full_shade', bloom_months: ALL_SEASON,
          }),
        },
      ],
      lightZones: [zone('sunny')],
    });
    expect(advice.filter((a) => a.kind === 'light_mismatch')).toHaveLength(1);
  });

  it('полутень не конфликтует ни с чем', () => {
    const advice = analyzeLandscape({
      objects: [bed('b1')],
      plantings: [
        {
          schemaObjectId: 'b1',
          plant: plant('h', { sun_exposure: 'full_sun', bloom_months: ALL_SEASON }),
        },
      ],
      lightZones: [zone('partial_shade')],
    });
    expect(advice.filter((a) => a.kind === 'light_mismatch')).toEqual([]);
  });

  it('без размеченных зон освещение не проверяется', () => {
    const advice = analyzeLandscape({
      objects: [bed('b1')],
      plantings: [
        {
          schemaObjectId: 'b1',
          plant: plant('h', { sun_exposure: 'full_shade', bloom_months: ALL_SEASON }),
        },
      ],
    });
    expect(advice.filter((a) => a.kind === 'light_mismatch')).toEqual([]);
  });
});

describe('цветовые сочетания', () => {
  it('замечает контраст тёплого и холодного', () => {
    const advice = analyzeLandscape({
      objects: [bed('b1', 'flowerbed', 'Парадная')],
      plantings: [
        { schemaObjectId: 'b1', plant: plant('a', { primary_color: '#C4243C', bloom_months: ALL_SEASON }) },
        { schemaObjectId: 'b1', plant: plant('b', { primary_color: '#4A63C4', bloom_months: ALL_SEASON }) },
      ],
    });
    const color = advice.filter((a) => a.kind === 'color');
    expect(color).toHaveLength(1);
    expect(color[0].title).toContain('Парадная');
    expect(color[0].title).toContain('контрастная');
  });

  it('хвалит выдержанную гамму, когда растений достаточно', () => {
    const warm = (id: string) =>
      plant(id, { primary_color: '#E8901E', bloom_months: ALL_SEASON });
    const advice = analyzeLandscape({
      objects: [bed('b1')],
      plantings: ['a', 'b', 'c'].map((id) => ({ schemaObjectId: 'b1', plant: warm(id) })),
    });
    expect(advice.find((a) => a.kind === 'color')?.title).toContain('гамма выдержана');
  });

  it('нецветущие растения в гамму не входят', () => {
    const advice = analyzeLandscape({
      objects: [bed('b1')],
      plantings: [
        { schemaObjectId: 'b1', plant: plant('a', { primary_color: '#C4243C', bloom_months: ALL_SEASON }) },
        { schemaObjectId: 'b1', plant: plant('thuja', { primary_color: '#3E7B3A', bloom_months: [] }) },
      ],
    });
    expect(advice.filter((a) => a.kind === 'color')).toEqual([]);
  });
});

describe('провалы в цветении', () => {
  it('называет месяцы без цветения', () => {
    const advice = analyzeLandscape({
      objects: [bed('b1')],
      plantings: [
        { schemaObjectId: 'b1', plant: plant('tulip', { bloom_months: [4, 5] }) },
      ],
    });
    const gap = advice.find((a) => a.kind === 'season_gap');
    expect(gap).toBeDefined();
    expect(gap?.text).toContain('июне');
    expect(gap?.text).toContain('августе');
    expect(gap?.text).not.toContain('апреле');
  });

  it('молчит, когда сезон закрыт целиком', () => {
    const advice = analyzeLandscape({
      objects: [bed('b1')],
      plantings: [{ schemaObjectId: 'b1', plant: plant('x', { bloom_months: ALL_SEASON }) }],
    });
    expect(advice.filter((a) => a.kind === 'season_gap')).toEqual([]);
  });

  it('молчит на пустом участке — там сначала нужны посадки', () => {
    const advice = analyzeLandscape({ objects: [bed('b1')], plantings: [] });
    expect(advice.filter((a) => a.kind === 'season_gap')).toEqual([]);
  });
});

describe('советник в целом', () => {
  it('даёт минимум 3 типа рекомендаций (критерий PLAN12)', () => {
    const advice = analyzeLandscape({
      objects: [bed('b1', 'flowerbed', 'Парадная'), bed('b2')],
      plantings: [
        {
          schemaObjectId: 'b1',
          plant: plant('rose', {
            name: 'Роза', catalogId: 'rose-tea-hybrid', primary_color: '#C4243C',
            sun_exposure: 'full_sun', incompatible_ids: ['thuja-smaragd'],
            bloom_months: [6, 7],
          }),
        },
        {
          schemaObjectId: 'b1',
          plant: plant('thuja', {
            name: 'Туя', catalogId: 'thuja-smaragd', primary_color: '#4A63C4',
            bloom_months: [],
          }),
        },
      ],
      lightZones: [zone('shade')],
    });
    const kinds = new Set(advice.map((a) => a.kind));
    expect(kinds.size).toBeGreaterThanOrEqual(3);
    expect(kinds).toContain('incompatible');
    expect(kinds).toContain('empty_zone');
    expect(kinds).toContain('season_gap');
  });

  it('предупреждения идут раньше наблюдений', () => {
    const advice = analyzeLandscape({
      objects: [bed('b1'), bed('b2')],
      plantings: [
        {
          schemaObjectId: 'b2',
          plant: plant('a', {
            catalogId: 'a', incompatible_ids: ['b'], bloom_months: ALL_SEASON,
          }),
        },
        { schemaObjectId: 'b2', plant: plant('b', { catalogId: 'b' }) },
      ],
    });
    expect(advice[0].severity).toBe('warning');
  });

  it('на пустой схеме советов нет', () => {
    expect(analyzeLandscape({ objects: [], plantings: [] })).toEqual([]);
  });

  it('id советов уникальны — панель рендерит их списком', () => {
    const advice = analyzeLandscape({
      objects: [bed('b1'), bed('b2'), bed('b3')],
      plantings: [],
    });
    const ids = advice.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
