/**
 * useRealtimeJournal — журнал посадки с realtime-подпиской PocketBase
 * (PLAN9 задача K.2).
 *
 * `journalEvents.subscribe()` шлёт события по всей коллекции — фильтруем по
 * `plantingId` и применяем изменение точечно (upsert/remove), поэтому запись,
 * сделанная на телефоне, мгновенно появляется на планшете без ручного
 * обновления. Мутации (добавить/удалить) — оптимистичные: UI меняется сразу,
 * а при ошибке сети откатывается к прежнему состоянию.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { journalEvents as journalEventsApi, type JournalEvent } from '../lib/pb';

/** Сортировка журнала: свежие события сверху. */
export function sortEvents(list: JournalEvent[]): JournalEvent[] {
  return [...list].sort(
    (a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime(),
  );
}

/**
 * Применить realtime-событие к списку (чистая функция для тестов).
 * create/update — upsert по id, delete — удаление. Список остаётся
 * отсортированным по дате (desc).
 */
export function applyRealtimeEvent(
  list: JournalEvent[],
  action: string,
  record: JournalEvent,
): JournalEvent[] {
  if (action === 'delete') {
    return list.filter((e) => e.id !== record.id);
  }
  // create | update → upsert
  const without = list.filter((e) => e.id !== record.id);
  return sortEvents([...without, record]);
}

export interface RealtimeJournal {
  events: JournalEvent[] | undefined;
  reload: () => Promise<void>;
  /** Оптимистично удалить событие; при ошибке — откат. */
  removeEvent: (id: string) => Promise<void>;
}

export function useRealtimeJournal(plantingId: string | undefined): RealtimeJournal {
  const [events, setEvents] = useState<JournalEvent[] | undefined>(undefined);
  // Держим актуальный список в ref, чтобы realtime-колбэк не пересоздавал подписку.
  const eventsRef = useRef<JournalEvent[] | undefined>(undefined);
  const setBoth = (list: JournalEvent[]) => {
    eventsRef.current = list;
    setEvents(list);
  };

  const reload = useCallback(async () => {
    if (!plantingId) return;
    const list = await journalEventsApi.list({ filter: `plantingId="${plantingId}"` });
    setBoth(sortEvents(list));
  }, [plantingId]);

  useEffect(() => {
    if (!plantingId) {
      setEvents(undefined);
      eventsRef.current = undefined;
      return;
    }

    let cancelled = false;
    let unsub: (() => void) | undefined;

    setEvents(undefined);
    eventsRef.current = undefined;
    void reload();

    void journalEventsApi
      .subscribe('*', ({ action, record }) => {
        if (cancelled || record.plantingId !== plantingId) return;
        const current = eventsRef.current ?? [];
        setBoth(applyRealtimeEvent(current, action, record));
      })
      .then((fn) => {
        if (cancelled) fn();
        else unsub = fn;
      });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [plantingId, reload]);

  const removeEvent = useCallback(async (id: string) => {
    const prev = eventsRef.current;
    // Оптимистично убираем из списка.
    if (prev) setBoth(prev.filter((e) => e.id !== id));
    try {
      await journalEventsApi.remove(id);
    } catch (err) {
      // Откат к прежнему состоянию.
      if (prev) setBoth(prev);
      throw err;
    }
  }, []);

  return { events, reload, removeEvent };
}
