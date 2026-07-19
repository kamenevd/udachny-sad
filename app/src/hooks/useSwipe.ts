/**
 * useSwipe — хук горизонтального свайпа для touch-устройств (задача 34.1).
 *
 * Возвращает ref для контейнера: свайп влево/вправо вызывает соответствующий
 * коллбэк. Игнорирует движения, где вертикальное смещение доминирует над
 * горизонтальным — чтобы не мешать обычному вертикальному скроллу.
 *
 * Использование:
 *   const ref = useSwipe<HTMLDivElement>({
 *     onSwipeLeft: () => goToNext(),
 *     onSwipeRight: () => goToPrev(),
 *   });
 *   <div ref={ref}>...</div>
 */

import { useRef, useCallback, useEffect } from 'react';

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Минимальное горизонтальное смещение в пикселях (по умолчанию 60) */
  threshold?: number;
}

export function useSwipe<T extends HTMLElement>({
  onSwipeLeft,
  onSwipeRight,
  threshold = 60,
}: UseSwipeOptions) {
  const ref = useRef<T | null>(null);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (startX.current === null || startY.current === null) return;

      const diffX = e.changedTouches[0].clientX - startX.current;
      const diffY = e.changedTouches[0].clientY - startY.current;
      startX.current = null;
      startY.current = null;

      // Горизонтальное смещение должно быть достаточным и заметно больше вертикального
      if (Math.abs(diffX) < threshold || Math.abs(diffX) < Math.abs(diffY) * 1.5) return;

      if (diffX < 0) onSwipeLeft?.();
      else onSwipeRight?.();
    },
    [onSwipeLeft, onSwipeRight, threshold],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchEnd]);

  return ref;
}
