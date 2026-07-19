/**
 * TimelineScrubber — горизонтальная шкала времени «Истории места»
 * (PLAN9 задача L.1).
 *
 * Вместо простого списка лет — лента в духе Apple Health: годы идут слева
 * направо, высота столбика пропорциональна числу посадок в году. Ленту можно
 * листать пальцем, а мышью — тянуть (drag-to-scroll). Тап по году фильтрует
 * список, «Все» сбрасывает фильтр.
 */
import { useRef } from 'react';

export interface YearBucket {
  year: number;
  count: number;
}

/**
 * Свернуть посадки в годовые корзины по году `plantedAt`, по возрастанию
 * (хронологически слева направо). Чистая функция — покрыта тестами.
 */
export function buildYearBuckets(
  items: { plantedAt: number | string }[],
): YearBucket[] {
  const counts = new Map<number, number>();
  for (const it of items) {
    const y = new Date(it.plantedAt).getFullYear();
    counts.set(y, (counts.get(y) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);
}

interface TimelineScrubberProps {
  buckets: YearBucket[];
  /** Выбранный год или 'all'. */
  selected: number | 'all';
  onSelect: (value: number | 'all') => void;
}

/** Максимальная высота столбика, px. */
const MAX_BAR = 44;
const MIN_BAR = 6;

export function TimelineScrubber({ buckets, selected, onSelect }: TimelineScrubberProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startX: number; startScroll: number; moved: boolean } | null>(null);

  const maxCount = Math.max(1, ...buckets.map((b) => b.count));

  const onPointerDown = (e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    drag.current = { startX: e.clientX, startScroll: el.scrollLeft, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el || !drag.current) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 3) drag.current.moved = true;
    el.scrollLeft = drag.current.startScroll - dx;
  };
  const endDrag = () => {
    drag.current = null;
  };
  /** Не срабатывать по годам, если это был drag, а не тап. */
  const guardedSelect = (value: number | 'all') => {
    if (drag.current?.moved) return;
    onSelect(value);
  };

  return (
    <div
      ref={scrollRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={endDrag}
      className="mb-4 flex touch-pan-x select-none items-end gap-3 overflow-x-auto pb-2"
      style={{ scrollbarWidth: 'none' }}
      role="group"
      aria-label="Шкала времени по годам"
    >
      {/* «Все годы» */}
      <button
        type="button"
        onClick={() => guardedSelect('all')}
        className={
          'flex h-[68px] shrink-0 flex-col items-center justify-end rounded-[6px] border-2 border-ink px-3 pb-1 font-poster text-[12px] uppercase tracking-[0.04em] transition-colors ' +
          (selected === 'all' ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-ink/10')
        }
        aria-pressed={selected === 'all'}
      >
        Все
      </button>

      {buckets.map((b) => {
        const isSel = selected === b.year;
        const h = MIN_BAR + Math.round((b.count / maxCount) * (MAX_BAR - MIN_BAR));
        return (
          <button
            key={b.year}
            type="button"
            onClick={() => guardedSelect(b.year)}
            className="flex h-[68px] shrink-0 flex-col items-center justify-end gap-1"
            aria-pressed={isSel}
            aria-label={`${b.year} год, посадок: ${b.count}`}
          >
            <span
              className={
                'w-8 rounded-t-[3px] transition-colors ' +
                (isSel ? 'bg-ink' : 'bg-ink/30')
              }
              style={{ height: `${h}px` }}
            />
            <span
              className={
                'font-mono text-[13px] ' + (isSel ? 'font-bold text-ink' : 'text-ink-muted')
              }
            >
              {b.year}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default TimelineScrubber;
