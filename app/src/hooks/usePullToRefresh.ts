/**
 * usePullToRefresh — хук pull-to-refresh для touch-устройств (задача 10.2).
 *
 * Отслеживает свайп вниз от верха страницы (когда scrollTop === 0),
 * при превышении порога вызывает коллбэк обновления.
 *
 * Использование:
 *   const { pullDistance, isRefreshing } = usePullToRefresh({
 *     onRefresh: async () => { await refetch(); }
 *   });
 *   // pullDistance в пикселях — для отображения индикатора
 */

import { useRef, useState, useCallback, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  /** Порог срабатывания в пикселях (по умолчанию 70) */
  threshold?: number;
  /** Максимальное сопротивление (по умолчанию 120) */
  maxPull?: number;
}

interface PullToRefreshState {
  /** Текущее расстояние pull в пикселях */
  pullDistance: number;
  /** Идёт ли обновление */
  isRefreshing: boolean;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 70,
  maxPull = 120,
}: UsePullToRefreshOptions): PullToRefreshState {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startY = useRef<number | null>(null);
  const pulling = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (isRefreshing) return;
      // Только если страница в самом верху
      if (window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
    },
    [isRefreshing],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (startY.current === null || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff > 0 && window.scrollY <= 0) {
        pulling.current = true;
        // Сопротивление: чем дальше тянем, тем медленнее растёт
        const eased = Math.min(maxPull, diff * 0.5);
        setPullDistance(eased);
        // Предотвращаем стандартный скролл только когда активно тянем
        if (diff > 10) e.preventDefault();
      }
    },
    [isRefreshing, maxPull],
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) {
      startY.current = null;
      return;
    }

    pulling.current = false;
    startY.current = null;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      // Плавно вернуть
      setPullDistance(0);
    }
  }, [pullDistance, threshold, onRefresh]);

  useEffect(() => {
    // passive: false для preventDefault в touchmove
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { pullDistance, isRefreshing };
}
