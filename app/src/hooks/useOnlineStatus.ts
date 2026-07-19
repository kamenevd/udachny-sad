/**
 * Задача F.1 — хуки статуса сети и размера офлайн-очереди.
 *
 * `useOnlineStatus()` — реактивный `navigator.onLine`.
 * `usePendingSyncCount()` — число неотправленных мутаций в очереди (F.4).
 */
import { useEffect, useState } from "react";
import { subscribeQueue, count } from "../lib/offline/queue";

/** Реактивный статус сети (SSR-безопасно, по умолчанию online). */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}

/** Число отложенных (неотправленных) мутаций в офлайн-очереди. */
export function usePendingSyncCount(): number {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let alive = true;
    void count().then((n) => {
      if (alive) setPending(n);
    });
    const unsub = subscribeQueue((n) => setPending(n));
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  return pending;
}
