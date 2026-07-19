/**
 * useMediaQuery — реактивный хук для media queries (задача 16.1).
 *
 * Возвращает true/false — соответствует ли запрос текущему viewport.
 * Подписывается на изменения, корректно работает с SSR (defaults: false).
 *
 * Примеры:
 *   const isMobile = useMediaQuery("(max-width: 640px)");
 *   const isDesktop = useMediaQuery("(min-width: 1024px)");
 */

import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    // Синхронизируем сразу при монтировании (значение могло измениться)
    setMatches(mql.matches);
    mql.addEventListener("change", handler);

    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
