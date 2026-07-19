import { describe, it, expect, beforeEach } from 'vitest';
import {
  addReminder,
  removeReminder,
  processDue,
  nextDueAt,
  atTimeToday,
  loadReminders,
  saveReminders,
  type ReminderStore,
  type ScheduledReminder,
} from './notificationScheduler';

/** In-memory заглушка хранилища. */
function memStore(): ReminderStore & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

describe('add/remove', () => {
  it('добавляет с уникальным id', () => {
    const a = addReminder([], { title: 'Полей клумбу', at: 1000 });
    const b = addReminder(a.list, { title: 'Запиши цветение', at: 2000 });
    expect(b.list).toHaveLength(2);
    expect(a.reminder.id).not.toBe(b.reminder.id);
  });
  it('удаляет по id', () => {
    const { list, reminder } = addReminder([], { title: 'X', at: 1 });
    expect(removeReminder(list, reminder.id)).toHaveLength(0);
  });
});

describe('processDue', () => {
  it('одноразовое срабатывает и исчезает', () => {
    const list: ScheduledReminder[] = [{ id: '1', title: 'A', at: 500 }];
    const { fired, remaining } = processDue(list, 1000);
    expect(fired.map((r) => r.id)).toEqual(['1']);
    expect(remaining).toHaveLength(0);
  });

  it('не срабатывает раньше времени', () => {
    const list: ScheduledReminder[] = [{ id: '1', title: 'A', at: 2000 }];
    const { fired, remaining } = processDue(list, 1000);
    expect(fired).toHaveLength(0);
    expect(remaining).toHaveLength(1);
  });

  it('повторяющееся переносится вперёд, пропуская просрочку', () => {
    const day = 24 * 60 * 60 * 1000;
    const list: ScheduledReminder[] = [{ id: '1', title: 'Полив', at: 0, repeatEveryDays: 1 }];
    // Прошло 3.5 дня офлайн — должно сработать один раз и встать на 4-й день.
    const now = 3.5 * day;
    const { fired, remaining } = processDue(list, now);
    expect(fired).toHaveLength(1);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].at).toBe(4 * day);
    expect(remaining[0].at).toBeGreaterThan(now);
    expect(remaining[0].lastFiredAt).toBe(now);
  });
});

describe('nextDueAt', () => {
  it('минимальное время', () => {
    expect(nextDueAt([{ id: 'a', title: 'x', at: 30 }, { id: 'b', title: 'y', at: 10 }])).toBe(10);
    expect(nextDueAt([])).toBeNull();
  });
});

describe('atTimeToday', () => {
  it('переносит на завтра, если время уже прошло', () => {
    const now = new Date(2026, 6, 19, 15, 0, 0).getTime(); // 15:00
    const at = atTimeToday(9, 0, now); // 09:00 уже прошло
    expect(at).toBeGreaterThan(now);
    expect(new Date(at).getHours()).toBe(9);
  });
  it('сегодня, если время впереди', () => {
    const now = new Date(2026, 6, 19, 8, 0, 0).getTime();
    const at = atTimeToday(9, 0, now);
    expect(new Date(at).getDate()).toBe(19);
    expect(new Date(at).getHours()).toBe(9);
  });
});

describe('persistence', () => {
  let store: ReturnType<typeof memStore>;
  beforeEach(() => {
    store = memStore();
  });
  it('save → load round-trip', () => {
    const list: ScheduledReminder[] = [{ id: '1', title: 'A', at: 100 }];
    saveReminders(list, store);
    expect(loadReminders(store)).toEqual(list);
  });
  it('битые данные → пустой список', () => {
    store.data['us:local-reminders:v1'] = '{not json';
    expect(loadReminders(store)).toEqual([]);
  });
  it('null store безопасен', () => {
    expect(loadReminders(null)).toEqual([]);
    expect(() => saveReminders([], null)).not.toThrow();
  });
});
