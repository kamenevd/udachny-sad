/**
 * Задача F.3 — оценка свободного места через Storage Manager API.
 *
 * `navigator.storage.estimate()` возвращает сколько места уже занято сайтом
 * (кэш, IndexedDB, фото) и сколько выделено браузером. Перед загрузкой фото
 * предупреждаем дачника «Мало места на телефоне», чтобы он не потерял снимок.
 *
 * Storage API есть не везде (старый iOS Safari) — при отсутствии считаем, что
 * места хватает (`supported: false`, `lowSpace: false`), чтобы не мешать.
 */
import { useCallback, useEffect, useState } from "react";

/** Порог «мало места» — меньше 50 МБ свободного места в квоте сайта. */
export const LOW_SPACE_BYTES = 50 * 1024 * 1024;
/** Либо занято больше 90% выделенной квоты. */
export const LOW_SPACE_RATIO = 0.9;

export interface StorageEstimate {
  supported: boolean;
  /** Занято сайтом, байт (undefined если неизвестно). */
  usage?: number;
  /** Выделено браузером, байт (undefined если неизвестно). */
  quota?: number;
  /** Оценка свободного места в квоте, байт. */
  available?: number;
  /** Доля занятого (0..1). */
  percentUsed?: number;
  /** Мало места — стоит предупредить перед загрузкой фото. */
  lowSpace: boolean;
  /** Перечитать оценку (например, после удаления фото). */
  refresh: () => void;
}

/** Чистая функция расчёта — вынесена для юнит-тестов. */
export function computeLowSpace(usage: number, quota: number): boolean {
  if (quota <= 0) return false;
  const available = quota - usage;
  return available < LOW_SPACE_BYTES || usage / quota > LOW_SPACE_RATIO;
}

function isSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "storage" in navigator &&
    typeof navigator.storage?.estimate === "function"
  );
}

export function useStorageEstimate(): StorageEstimate {
  const [state, setState] = useState<Omit<StorageEstimate, "refresh">>(() => ({
    supported: isSupported(),
    lowSpace: false,
  }));

  const refresh = useCallback(() => {
    if (!isSupported()) {
      setState({ supported: false, lowSpace: false });
      return;
    }
    void navigator.storage
      .estimate()
      .then(({ usage, quota }) => {
        const u = usage ?? 0;
        const q = quota ?? 0;
        setState({
          supported: true,
          usage: u,
          quota: q,
          available: q > 0 ? q - u : undefined,
          percentUsed: q > 0 ? u / q : undefined,
          lowSpace: computeLowSpace(u, q),
        });
      })
      .catch(() => {
        setState({ supported: false, lowSpace: false });
      });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}
