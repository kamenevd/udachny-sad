/**
 * notificationScheduler — планировщик локальных напоминаний без сервера
 * (PLAN9 задача J.1).
 *
 * Хранит расписание в localStorage: «Полей грядку №3», «Запиши урожай».
 * Логика чистая и тестируемая (время и хранилище инжектируются). Показ
 * уведомлений и таймеры — в `useLocalNotifications`; здесь только «что и когда».
 *
 * Одноразовое напоминание после срабатывания удаляется; повторяющееся
 * (`repeatEveryDays`) переносится вперёд, пропуская просроченные интервалы,
 * чтобы после долгого офлайна не сыпать пачкой уведомлений.
 */

export interface ScheduledReminder {
  id: string;
  title: string;
  body?: string;
  /** Когда показать, epoch ms */
  at: number;
  /** Период повтора в днях; отсутствует — одноразовое */
  repeatEveryDays?: number;
  /** Когда в последний раз сработало */
  lastFiredAt?: number;
}

export type ReminderInput = Omit<ScheduledReminder, 'id' | 'lastFiredAt'>;

const STORAGE_KEY = 'us:local-reminders:v1';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Минимальный интерфейс хранилища (localStorage совместим). */
export interface ReminderStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStore(): ReminderStore | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    /* доступ к localStorage может быть запрещён (приватный режим) */
  }
  return null;
}

export function loadReminders(store: ReminderStore | null = defaultStore()): ScheduledReminder[] {
  if (!store) return [];
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ScheduledReminder[]) : [];
  } catch {
    return [];
  }
}

export function saveReminders(
  list: ScheduledReminder[],
  store: ReminderStore | null = defaultStore(),
): void {
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* переполнение квоты — молча игнорируем, напоминания не критичны */
  }
}

let idCounter = 0;
function makeId(): string {
  idCounter += 1;
  return `rem_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

/** Добавить напоминание, вернуть обновлённый список. */
export function addReminder(
  list: ScheduledReminder[],
  input: ReminderInput,
): { list: ScheduledReminder[]; reminder: ScheduledReminder } {
  const reminder: ScheduledReminder = { ...input, id: makeId() };
  return { list: [...list, reminder], reminder };
}

export function removeReminder(list: ScheduledReminder[], id: string): ScheduledReminder[] {
  return list.filter((r) => r.id !== id);
}

/**
 * Перенести повторяющееся напоминание вперёд после срабатывания, пропуская
 * все просроченные интервалы (следующий `at` строго больше `now`).
 */
function advanceRepeat(reminder: ScheduledReminder, now: number): ScheduledReminder {
  const step = reminder.repeatEveryDays! * DAY_MS;
  let next = reminder.at;
  do {
    next += step;
  } while (next <= now);
  return { ...reminder, at: next, lastFiredAt: now };
}

/**
 * Разобрать список на «сработавшие сейчас» и «оставшееся расписание».
 * Одноразовые сработавшие исчезают; повторяющиеся переносятся вперёд.
 */
export function processDue(
  list: ScheduledReminder[],
  now: number,
): { fired: ScheduledReminder[]; remaining: ScheduledReminder[] } {
  const fired: ScheduledReminder[] = [];
  const remaining: ScheduledReminder[] = [];
  for (const r of list) {
    if (r.at <= now) {
      fired.push(r);
      if (r.repeatEveryDays && r.repeatEveryDays > 0) {
        remaining.push(advanceRepeat(r, now));
      }
    } else {
      remaining.push(r);
    }
  }
  return { fired, remaining };
}

/** Ближайшее время срабатывания (epoch ms) или null, если расписание пусто. */
export function nextDueAt(list: ScheduledReminder[]): number | null {
  if (list.length === 0) return null;
  return list.reduce((min, r) => Math.min(min, r.at), Infinity);
}

/** Утилита: время сегодня в HH:MM (или завтра, если уже прошло). */
export function atTimeToday(hours: number, minutes: number, now = Date.now()): number {
  const d = new Date(now);
  d.setHours(hours, minutes, 0, 0);
  let ts = d.getTime();
  if (ts <= now) ts += DAY_MS;
  return ts;
}
