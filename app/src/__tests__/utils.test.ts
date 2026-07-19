/**
 * Тесты утилит и чистых функций (задача 13.2)
 */
import { describe, it, expect } from 'vitest';
import { EVENT_TYPES, eventTypeInfo } from '../components/EventForm';
import { PLANTING_STATUS_LABELS, plantingStatusLabel } from '../screens/PlantingDetail';

describe('cardNumberFromId (псевдо-алгоритм)', () => {
  // Симулируем алгоритм из PlantingDetail
  function cardNumberFromId(id: string): number {
    let n = 0;
    for (let i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) % 999;
    return n + 1;
  }

  it('возвращает число от 1 до 999', () => {
    for (const id of ['abc', 'k12345', 'xyz789', 'a']) {
      const n = cardNumberFromId(id);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(999);
    }
  });

  it('детерминирован — одинаковый ID → одинаковый номер', () => {
    expect(cardNumberFromId('test123')).toBe(cardNumberFromId('test123'));
  });

  it('разные ID → скорее всего разные номера', () => {
    const n1 = cardNumberFromId('planting-001');
    const n2 = cardNumberFromId('planting-002');
    expect(n1).not.toBe(n2);
  });
});

describe('formatSize (форматирование размера файла)', () => {
  function formatSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} КБ`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
  }

  it('пустой ввод → пустая строка', () => {
    expect(formatSize(undefined)).toBe('');
    expect(formatSize(0)).toBe('');
  });

  it('байты < 1024 → «N Б»', () => {
    expect(formatSize(500)).toBe('500 Б');
    expect(formatSize(1)).toBe('1 Б');
  });

  it('байты < 1MB → «N КБ»', () => {
    expect(formatSize(1024)).toBe('1 КБ');
    expect(formatSize(5120)).toBe('5 КБ');
  });

  it('байты >= 1MB → «N.M МБ»', () => {
    expect(formatSize(1024 * 1024)).toBe('1.0 МБ');
    expect(formatSize(1024 * 1024 * 2.5)).toBe('2.5 МБ');
  });
});

describe('eventTypeInfo', () => {
  it('возвращает правильную информацию для известного типа', () => {
    const info = eventTypeInfo('watering');
    expect(info.label).toBe('Полив');
    expect(info.icon).toBe('💧');
  });

  it('возвращает «Другое» для неизвестного типа', () => {
    const info = eventTypeInfo('unknown_type');
    expect(info.label).toBe('Другое');
    expect(info.icon).toBe('📝');
  });

  it('всего 11 типов событий', () => {
    expect(EVENT_TYPES).toHaveLength(11);
  });

  it('все типы имеют уникальные значения', () => {
    const types = EVENT_TYPES.map((t) => t.type);
    expect(new Set(types).size).toBe(types.length);
  });
});

describe('plantingStatusLabel', () => {
  it('возвращает русский лейбл для известных статусов', () => {
    expect(plantingStatusLabel('active')).toBe('Растёт');
    expect(plantingStatusLabel('dead')).toBe('Погибло');
    expect(plantingStatusLabel('completed')).toBe('Завершено');
  });

  it('возвращает исходную строку для неизвестного статуса', () => {
    expect(plantingStatusLabel('unknown')).toBe('unknown');
  });

  it('PLANTING_STATUS_LABELS содержит 4 статуса', () => {
    expect(Object.keys(PLANTING_STATUS_LABELS)).toHaveLength(4);
  });
});
