/**
 * PullToRefreshIndicator — визуальный индикатор жеста pull-to-refresh (задача 34.2).
 *
 * Показывает крутящуюся стрелку, которая проявляется по мере оттягивания
 * списка вниз и вращается во время обновления. Управляется значениями
 * из хука usePullToRefresh (pullDistance, isRefreshing).
 */

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  /** Порог срабатывания — при достижении стрелка «готова» (по умолчанию 70) */
  threshold?: number;
}

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  threshold = 70,
}: PullToRefreshIndicatorProps) {
  if (pullDistance <= 0 && !isRefreshing) return null;

  const ready = pullDistance >= threshold;
  const opacity = Math.min(1, pullDistance / threshold);
  const rotate = isRefreshing ? 0 : Math.min(180, (pullDistance / threshold) * 180);

  return (
    <div
      className="pointer-events-none flex items-center justify-center overflow-hidden transition-[height] duration-150"
      style={{ height: isRefreshing ? 48 : pullDistance }}
      aria-hidden={!isRefreshing}
    >
      <div
        className="flex items-center gap-2 font-mono text-[14px] text-ink-muted"
        style={{ opacity }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isRefreshing ? 'animate-spin' : ''}
          style={isRefreshing ? undefined : { transform: `rotate(${rotate}deg)` }}
        >
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <path d="M21 3v6h-6" />
        </svg>
        <span>
          {isRefreshing ? 'Обновляем…' : ready ? 'Отпустите для обновления' : 'Потяните вниз'}
        </span>
      </div>
    </div>
  );
}
