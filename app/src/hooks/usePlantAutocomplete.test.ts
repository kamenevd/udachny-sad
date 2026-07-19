import { describe, it, expect } from 'vitest';
import { suggestVarieties, PLANT_VARIETIES } from './usePlantAutocomplete';

describe('suggestVarieties', () => {
  it('возвращает пусто на коротком запросе', () => {
    expect(suggestVarieties('')).toEqual([]);
    expect(suggestVarieties('т')).toEqual([]);
  });

  it('находит по названию', () => {
    const res = suggestVarieties('томат');
    expect(res.length).toBeGreaterThan(0);
    expect(res.every((r) => r.name === 'Томат')).toBe(true);
  });

  it('находит по сорту', () => {
    const res = suggestVarieties('бычье');
    expect(res[0]).toMatchObject({ name: 'Томат', variety: 'Бычье сердце' });
  });

  it('нечувствителен к ё/е', () => {
    const res = suggestVarieties('свекла');
    expect(res.some((r) => r.name === 'Свёкла')).toBe(true);
  });

  it('приоритет точного начала названия над вхождением сорта', () => {
    const res = suggestVarieties('огурец');
    expect(res[0].name).toBe('Огурец');
  });

  it('соблюдает лимит', () => {
    expect(suggestVarieties('о', 3).length).toBeLessThanOrEqual(3);
    expect(suggestVarieties('а', 5).length).toBeLessThanOrEqual(5);
  });

  it('каждая запись базы имеет валидный тип и высоту', () => {
    for (const v of PLANT_VARIETIES) {
      expect(['tree', 'shrub', 'perennial', 'annual']).toContain(v.type);
      expect(v.heightCm).toBeGreaterThan(0);
      expect(typeof v.bloom).toBe('string');
    }
  });
});
