import { describe, it, expect } from 'vitest';
import { suggestVarieties, PLANT_VARIETIES } from './usePlantAutocomplete';

describe('suggestVarieties', () => {
  it('возвращает пусто на коротком запросе', () => {
    expect(suggestVarieties('')).toEqual([]);
    expect(suggestVarieties('т')).toEqual([]);
  });

  it('находит по названию', () => {
    const res = suggestVarieties('пион');
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((r) => r.name === 'Пион')).toBe(true);
  });

  it('находит по сорту', () => {
    const res = suggestVarieties('фламмен');
    expect(res[0]).toMatchObject({ name: 'Роза плетистая', variety: 'Фламментанц' });
  });

  it('нечувствителен к ё/е', () => {
    const res = suggestVarieties('ковер');
    expect(res.some((r) => r.variety === 'Снежный ковёр')).toBe(true);
  });

  it('приоритет точного начала названия над вхождением сорта', () => {
    const res = suggestVarieties('туя');
    expect(res[0].name).toBe('Туя западная');
  });

  it('соблюдает лимит', () => {
    expect(suggestVarieties('ро', 3).length).toBeLessThanOrEqual(3);
    expect(suggestVarieties('ба', 5).length).toBeLessThanOrEqual(5);
  });

  it('каждая запись базы имеет валидный тип и высоту', () => {
    for (const v of PLANT_VARIETIES) {
      expect(['tree', 'shrub', 'perennial', 'annual']).toContain(v.type);
      expect(v.heightCm).toBeGreaterThan(0);
      expect(typeof v.bloom).toBe('string');
    }
  });
});
