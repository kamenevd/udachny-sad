/**
 * Задача F.1 — движок синхронизации офлайн-очереди с PocketBase.
 *
 * Разгребает очередь мутаций (queue.ts): для каждой записи вызывает
 * соответствующую операцию PocketBase (create/update/delete). Успех —
 * запись удаляется из очереди; ошибка — увеличиваем счётчик retries и
 * оставляем на следующий раз (после MAX_RETRIES считаем «отравленной» и
 * тоже удаляем, чтобы очередь не застревала навсегда).
 */
import { pb } from "../pb";
import {
  getAll,
  put,
  remove,
  count,
  subscribeQueue,
  type QueuedMutation,
} from "./queue";

const MAX_RETRIES = 5;

// Реэкспорт для UI — чтобы SyncIndicator/хуки импортировали всё из одного места.
export { subscribeQueue, count as pendingCount } from "./queue";

let flushing = false;

async function applyMutation(m: QueuedMutation): Promise<void> {
  const col = pb.collection(m.collection);
  switch (m.op) {
    case "create":
      await col.create(m.data ?? {});
      break;
    case "update":
      if (!m.recordId) throw new Error("update без recordId");
      await col.update(m.recordId, m.data ?? {});
      break;
    case "delete":
      if (!m.recordId) throw new Error("delete без recordId");
      await col.delete(m.recordId);
      break;
  }
}

/**
 * Прогоняет очередь. Возвращает сколько записей успешно отправлено и сколько
 * осталось/провалилось. Защищён модульным локом от параллельных запусков.
 */
export async function flushQueue(): Promise<{ synced: number; failed: number }> {
  if (flushing) return { synced: 0, failed: 0 };
  flushing = true;
  let synced = 0;
  let failed = 0;
  try {
    const queue = await getAll();
    for (const m of queue) {
      try {
        await applyMutation(m);
        await remove(m.id);
        synced += 1;
      } catch {
        const retries = m.retries + 1;
        if (retries >= MAX_RETRIES) {
          // «Отравленная» мутация — убираем, чтобы не блокировать очередь.
          await remove(m.id);
        } else {
          await put({ ...m, retries });
        }
        failed += 1;
      }
    }
  } finally {
    flushing = false;
  }
  return { synced, failed };
}

/**
 * Автосинхронизация: слушает событие `online` и прогоняет очередь; если сеть
 * уже есть — прогоняет сразу. Возвращает функцию очистки.
 */
export function startAutoSync(): () => void {
  const onOnline = () => {
    void flushQueue();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("online", onOnline);
    if (typeof navigator !== "undefined" && navigator.onLine) {
      void flushQueue();
    }
  }
  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", onOnline);
    }
  };
}
