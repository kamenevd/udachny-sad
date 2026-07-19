/**
 * useQueuedPbAction — PocketBase-аналог useQueuedMutation (задача C.4).
 *
 * useQueuedMutation.ts был завязан на convex/react `useMutation` +
 * `FunctionReference` — с переходом EventForm на PocketBase SDK нужен
 * эквивалент без Convex-специфичных типов, оборачивающий произвольную
 * async-функцию (обычно `journalEvents.create`).
 *
 * Пример:
 *   const q = useQueuedPbAction((args) => journalEvents.create(args), "journalEvents.create");
 *   await q.enqueueOrRun({ plantingId, eventType: "watering", eventDate });
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../components/Toast";

interface QueuedItem<Args> {
  id: string;
  args: Args;
  timestamp: number;
}

interface QueuedPbActionReturn<Args, R> {
  /** Если онлайн — вызывает действие сразу. Если оффлайн — кладёт в очередь. */
  enqueueOrRun: (
    args: Args,
  ) => Promise<{ queued: true; id: string } | { queued: false; data: R }>;
  /** Сколько записей сейчас в очереди для этого действия. */
  pendingCount: number;
}

function storageKey(queueKey: string): string {
  return `queuedMutations:${queueKey}`;
}

function readQueue<Args>(queueKey: string): QueuedItem<Args>[] {
  try {
    const raw = window.localStorage.getItem(storageKey(queueKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedItem<Args>[]) : [];
  } catch {
    return [];
  }
}

function writeQueue<Args>(queueKey: string, queue: QueuedItem<Args>[]): void {
  try {
    window.localStorage.setItem(storageKey(queueKey), JSON.stringify(queue));
  } catch {
    /* localStorage недоступен/переполнен — тихо игнорируем */
  }
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `${Date.now()}-${idCounter}`;
}

export function useQueuedPbAction<Args, R>(
  action: (args: Args) => Promise<R>,
  queueKey: string,
): QueuedPbActionReturn<Args, R> {
  const { showToast } = useToast();
  const [pendingCount, setPendingCount] = useState(
    () => readQueue<Args>(queueKey).length,
  );

  const flushQueue = useCallback(async () => {
    const queue = readQueue<Args>(queueKey);
    if (queue.length === 0) return;

    const remaining: QueuedItem<Args>[] = [];
    let syncedCount = 0;

    for (const item of queue) {
      try {
        await action(item.args);
        syncedCount += 1;
      } catch {
        remaining.push(item);
      }
    }

    writeQueue(queueKey, remaining);
    setPendingCount(remaining.length);

    if (syncedCount > 0) {
      showToast(`Синхронизировано ${syncedCount} записей`, "success");
    }
  }, [action, queueKey, showToast]);

  useEffect(() => {
    const handleOnline = () => {
      void flushQueue();
    };
    window.addEventListener("online", handleOnline);
    if (navigator.onLine) void flushQueue();
    return () => window.removeEventListener("online", handleOnline);
  }, [flushQueue]);

  const enqueueOrRun = useCallback(
    async (args: Args): Promise<{ queued: true; id: string } | { queued: false; data: R }> => {
      if (navigator.onLine) {
        const data = await action(args);
        return { queued: false as const, data };
      }

      const queue = readQueue<Args>(queueKey);
      const item: QueuedItem<Args> = { id: nextId(), args, timestamp: Date.now() };
      const nextQueue = [...queue, item];
      writeQueue(queueKey, nextQueue);
      setPendingCount(nextQueue.length);
      showToast("Действие сохранено — синхронизируем при появлении связи", "info");
      return { queued: true as const, id: item.id };
    },
    [action, queueKey, showToast],
  );

  return useMemo(() => ({ enqueueOrRun, pendingCount }), [enqueueOrRun, pendingCount]);
}
