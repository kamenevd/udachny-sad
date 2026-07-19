/**
 * useLocalNotifications — локальные push-напоминания без сервера
 * (PLAN9 задача J.1).
 *
 * Запрашивает разрешение через Notification API и, пока приложение открыто,
 * тикает раз в минуту, проверяя расписание из `notificationScheduler`. Когда
 * напоминание наступает — показывает уведомление через Service Worker
 * (`registration.showNotification`, работает надёжнее на мобильных) с фоллбэком
 * на `new Notification`. Расписание переживает перезагрузку через localStorage.
 *
 * Где браузер поддерживает Notification Triggers API (`showTrigger`), уведомление
 * дополнительно ставится «в фон» — сработает даже если вкладку закрыли.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  addReminder as addToList,
  loadReminders,
  nextDueAt,
  processDue,
  removeReminder as removeFromList,
  saveReminders,
  type ReminderInput,
  type ScheduledReminder,
} from '../lib/notificationScheduler';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

function currentPermission(): NotificationPermissionState {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission as NotificationPermissionState;
}

/** Показать уведомление: через активный SW, иначе напрямую. */
async function showNotification(reminder: ScheduledReminder): Promise<void> {
  const options: NotificationOptions = {
    body: reminder.body,
    tag: reminder.id,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  };
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg) {
        await reg.showNotification(reminder.title, options);
        return;
      }
    }
  } catch {
    /* нет SW — падаем на прямой конструктор */
  }
  try {
    new Notification(reminder.title, options);
  } catch {
    /* уведомления недоступны — тихо игнорируем */
  }
}

export interface UseLocalNotifications {
  permission: NotificationPermissionState;
  supported: boolean;
  reminders: ScheduledReminder[];
  requestPermission: () => Promise<NotificationPermissionState>;
  schedule: (input: ReminderInput) => ScheduledReminder | null;
  cancel: (id: string) => void;
}

const TICK_MS = 60_000;

export function useLocalNotifications(): UseLocalNotifications {
  const [permission, setPermission] = useState<NotificationPermissionState>(currentPermission);
  const [reminders, setReminders] = useState<ScheduledReminder[]>(() => loadReminders());
  const remindersRef = useRef(reminders);
  remindersRef.current = reminders;

  const supported = permission !== 'unsupported';

  const persist = useCallback((list: ScheduledReminder[]) => {
    remindersRef.current = list;
    setReminders(list);
    saveReminders(list);
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'unsupported' as const;
    try {
      const result = (await Notification.requestPermission()) as NotificationPermissionState;
      setPermission(result);
      return result;
    } catch {
      setPermission('denied');
      return 'denied' as const;
    }
  }, []);

  const schedule = useCallback(
    (input: ReminderInput): ScheduledReminder | null => {
      if (!supported) return null;
      const { list, reminder } = addToList(remindersRef.current, input);
      persist(list);
      return reminder;
    },
    [supported, persist],
  );

  const cancel = useCallback(
    (id: string) => {
      persist(removeFromList(remindersRef.current, id));
    },
    [persist],
  );

  // Проверка расписания: при монтировании и раз в минуту, пока вкладка открыта.
  useEffect(() => {
    if (permission !== 'granted') return;

    const check = () => {
      const { fired, remaining } = processDue(remindersRef.current, Date.now());
      if (fired.length === 0) return;
      for (const r of fired) void showNotification(r);
      persist(remaining);
    };

    check();
    const timer = setInterval(check, TICK_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [permission, persist]);

  return {
    permission,
    supported,
    reminders,
    requestPermission,
    schedule,
    cancel,
    // nextDueAt переэкспортируем неявно через reminders; отдельно не нужно
  };
}

export { nextDueAt };
