/**
 * usePbCollection — PocketBase-аналог реактивного convex `useQuery` (задача C.3).
 *
 * Convex-запросы были реактивными "из коробки" (подписка на изменения БД).
 * PocketBase realtime API шлёт события по всей коллекции (нет server-side
 * фильтрации по подписке), поэтому здесь — простая, но надёжная схема:
 * подписка на "*" всей коллекции + полный refetch отфильтрованного списка
 * при любом событии create/update/delete. Для MVP-масштаба (один участок
 * на пользователя) это приемлемо по производительности.
 */
import { useCallback, useEffect, useState } from "react";
import type { RecordModel } from "pocketbase";

interface CollectionApi<T extends RecordModel> {
  list: (options?: { sort?: string; filter?: string }) => Promise<T[]>;
  subscribe: (
    topic: string,
    cb: (e: { action: string; record: T }) => void,
  ) => Promise<() => void>;
}

export function usePbCollection<T extends RecordModel>(
  api: CollectionApi<T>,
  filter: string | undefined,
  active = true,
): { data: T[] | undefined; refetch: () => Promise<T[]> } {
  const [data, setData] = useState<T[] | undefined>(undefined);

  const refetch = useCallback(async (): Promise<T[]> => {
    if (!active) return [];
    const list = await api.list({ filter });
    setData(list);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, filter, active]);

  useEffect(() => {
    if (!active) {
      setData(undefined);
      return;
    }
    let cancelled = false;
    let unsub: (() => void) | undefined;

    void refetch();
    void api.subscribe("*", () => {
      if (!cancelled) void refetch();
    }).then((fn) => {
      if (cancelled) fn();
      else unsub = fn;
    });

    return () => {
      cancelled = true;
      unsub?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, filter]);

  return { data, refetch };
}
