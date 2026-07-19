/**
 * Skeleton — placeholder-блоки для loading-состояний (задача 10.1).
 *
 * Заменяет «Загрузка…» на серые анимированные блоки в стиле карточек.
 * DESIGN.md v5.1 — двойная рамка, бумажный стиль.
 *
 * Использование:
 *   {data === undefined ? <PlantCardSkeleton /> : <PlantCard ... />}
 *   <SkeletonLines count={3} />  // три строки текста
 */

interface SkeletonProps {
  className?: string;
}

/** Базовый shimmer-блок */
function ShimmerBlock({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-ink/10 ${className}`}
      aria-hidden="true"
    />
  );
}

/** Скелетон карточки посадки */
export function PlantCardSkeleton() {
  return (
    <div className="rounded-[10px] border-2 border-ink bg-surface p-[5px] shadow-blank" aria-hidden="true">
      <div className="rounded-[6px] border border-ink p-4">
        <div className="mb-3">
          <ShimmerBlock className="h-[8px] w-16" />
        </div>
        <div className="mb-2">
          <ShimmerBlock className="h-[24px] w-3/4" />
        </div>
        <div className="mb-1 flex items-center gap-2">
          <ShimmerBlock className="h-[14px] w-20" />
          <ShimmerBlock className="h-[14px] w-12" />
        </div>
        <ShimmerBlock className="h-[14px] w-24" />
      </div>
    </div>
  );
}

/** Скелетон строки списка (справочник растений, события) */
export function SkeletonLineItem() {
  return (
    <div
      className="rounded-[10px] border-2 border-ink bg-surface p-[5px] shadow-blank"
      aria-hidden="true"
    >
      <div className="rounded-[6px] border border-ink p-3">
        <div className="flex items-center gap-2">
          <ShimmerBlock className="h-[18px] w-[18px] rounded-full" />
          <ShimmerBlock className="h-[15px] flex-1" />
          <ShimmerBlock className="h-[13px] w-16" />
        </div>
        <ShimmerBlock className="mt-2 h-[14px] w-2/3" />
      </div>
    </div>
  );
}

/** Скелетон списка из N строк */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonLineItem key={i} />
      ))}
    </div>
  );
}

/** Скелетон заголовка экрана */
export function SkeletonHeader() {
  return (
    <div className="sticky top-0 z-10 border-b-2 border-ink bg-paper px-4 py-4" aria-hidden="true">
      <div className="flex items-center gap-3">
        <ShimmerBlock className="h-[28px] w-[28px] rounded" />
        <ShimmerBlock className="h-[21px] w-32" />
      </div>
    </div>
  );
}

/** Универсальные строки текста-скелетона */
export function SkeletonLines({ count = 3, className = '' }: { count?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerBlock
          key={i}
          className="h-[16px]"
          // Последняя строка короче — визуально как абзац
        />
      ))}
    </div>
  );
}

/**
 * Озвучивание загрузки для скринридеров (задача 26.4).
 * Скелетоны визуально decorative (aria-hidden), но сама загрузка должна
 * быть анонсирована — невидимый live-region рядом с ними.
 */
export function LoadingAnnouncer({ label = 'Загрузка…' }: { label?: string }) {
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {label}
    </span>
  );
}
