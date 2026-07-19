import { describe, it, expect } from 'vitest';
import { applyRealtimeEvent, sortEvents } from './useRealtimeJournal';
import type { JournalEvent } from '../lib/pb';

function ev(id: string, date: string): JournalEvent {
  return {
    id,
    plantingId: 'p1',
    eventType: 'watering',
    eventDate: date,
  } as JournalEvent;
}

describe('sortEvents', () => {
  it('свежие сверху', () => {
    const list = [ev('a', '2026-01-01'), ev('b', '2026-03-01'), ev('c', '2026-02-01')];
    expect(sortEvents(list).map((e) => e.id)).toEqual(['b', 'c', 'a']);
  });
  it('не мутирует исходный массив', () => {
    const list = [ev('a', '2026-01-01'), ev('b', '2026-02-01')];
    sortEvents(list);
    expect(list.map((e) => e.id)).toEqual(['a', 'b']);
  });
});

describe('applyRealtimeEvent', () => {
  const base = [ev('a', '2026-02-01'), ev('b', '2026-01-01')];

  it('create — вставка с сохранением сортировки', () => {
    const res = applyRealtimeEvent(base, 'create', ev('c', '2026-03-01'));
    expect(res.map((e) => e.id)).toEqual(['c', 'a', 'b']);
  });

  it('update — замена по id без дублей', () => {
    const res = applyRealtimeEvent(base, 'update', ev('b', '2026-05-01'));
    expect(res.map((e) => e.id)).toEqual(['b', 'a']);
    expect(res.filter((e) => e.id === 'b')).toHaveLength(1);
  });

  it('delete — удаление по id', () => {
    const res = applyRealtimeEvent(base, 'delete', ev('a', '2026-02-01'));
    expect(res.map((e) => e.id)).toEqual(['b']);
  });

  it('delete несуществующего — без изменений', () => {
    const res = applyRealtimeEvent(base, 'delete', ev('zzz', '2026-02-01'));
    expect(res.map((e) => e.id)).toEqual(['a', 'b']);
  });
});
