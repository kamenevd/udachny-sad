/**
 * OfflineBanner — баннер «Нет связи с дачей» (задача 8.2).
 *
 * Показывается при потере соединения с Convex (onError или
 * navigator.onLine === false), автоскрытие при восстановлении.
 *
 * DESIGN.md v5.1 — бумажный стиль, верхний sticky-баннер.
 *
 * Использование:
 *   <OfflineBanner onError={connectionError} />
 */

import { useEffect, useState } from 'react';

interface OfflineBannerProps {
  /** Внешний сигнал об ошибке подключения (от Convex client) */
  onError?: Error | null;
  /** Сброс внешней ошибки */
  onClearError?: () => void;
}

export function OfflineBanner({ onError, onClearError }: OfflineBannerProps) {
  const [browserOffline, setBrowserOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setBrowserOffline(false);
    const handleOffline = () => setBrowserOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const isOffline = browserOffline || onError !== undefined;

  if (!isOffline) return null;

  const isBrowserOffline = browserOffline;

  return (
    <div
      className="sticky top-0 z-[100] flex items-center justify-center gap-2 border-b-2 border-ink bg-red/10 px-4 py-2"
      role="alert"
      aria-live="assertive"
    >
      <span className="text-[18px]">{isBrowserOffline ? '📡' : '⚠️'}</span>
      <span className="font-poster text-[14px] font-semibold uppercase tracking-[0.03em] text-ink">
        {isBrowserOffline
          ? 'Нет интернета — работаем оффлайн'
          : 'Нет связи с дачей — данные могут быть устаревшими'}
      </span>
      {!isBrowserOffline && onClearError && (
        <button
          type="button"
          onClick={onClearError}
          className="ml-2 text-[14px] text-blueink underline underline-offset-2"
        >
          Повторить
        </button>
      )}
    </div>
  );
}
