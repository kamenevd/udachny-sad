/**
 * PLAN12 задача 3 — таймлайн цветения по месяцам.
 *
 * 12 колонок-месяцев; тап переключает фильтр «что цветёт в N», повторный тап
 * по активному месяцу снимает фильтр. Под названием месяца — счётчик растений,
 * чтобы пустые месяцы (январь-февраль в Подмосковье) были видны сразу.
 *
 * Стиль — бумажный бланк DESIGN.md: border-ink, bg-surface, активный месяц
 * инвертируется в bg-ink/text-paper, как кнопки режимов в EditorToolbar.
 */

import { MONTHS_RU, MONTHS_RU_IN } from '../../types/plant';

interface BloomingTimelineProps {
  /** Выбранный месяц 1-12; `null` — фильтр снят */
  selectedMonth: number | null;
  onSelectMonth: (month: number | null) => void;
  /** Сколько растений цветёт в каждом месяце (индекс 0 = январь) */
  countByMonth?: number[];
  /** Подсветить текущий месяц тонкой рамкой — «сейчас в саду» */
  currentMonth?: number;
  className?: string;
}

export function BloomingTimeline({
  selectedMonth,
  onSelectMonth,
  countByMonth,
  currentMonth = new Date().getMonth() + 1,
  className = '',
}: BloomingTimelineProps) {
  return (
    <section
      className={`rounded-[10px] border-2 border-ink bg-paper p-[5px] shadow-blank ${className}`}
      aria-label="Календарь цветения"
    >
      <div className="rounded-[6px] border border-ink p-3">
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <p className="font-poster text-[13px] uppercase tracking-[0.05em] text-ink-muted">
            🌸 Календарь цветения
          </p>
          {selectedMonth !== null && (
            <button
              type="button"
              onClick={() => onSelectMonth(null)}
              className="font-mono text-[13px] text-blueink underline underline-offset-2"
            >
              Сбросить
            </button>
          )}
        </div>

        <div
          className="flex gap-1 overflow-x-auto pb-1"
          role="group"
          aria-label="Месяцы цветения"
        >
          {MONTHS_RU.map((label, i) => {
            const month = i + 1;
            const active = selectedMonth === month;
            const count = countByMonth?.[i];
            const isCurrent = currentMonth === month;
            return (
              <button
                key={label}
                type="button"
                aria-pressed={active}
                aria-label={`Цветёт в ${MONTHS_RU_IN[i]}${count != null ? `, растений: ${count}` : ''}`}
                onClick={() => onSelectMonth(active ? null : month)}
                className={[
                  'flex min-h-[48px] min-w-[44px] shrink-0 flex-col items-center justify-center gap-0.5',
                  'rounded-[6px] border-2 px-1 py-1 transition-colors',
                  active
                    ? 'border-ink bg-ink text-paper'
                    : isCurrent
                      ? 'border-red bg-surface text-ink hover:bg-ink/10'
                      : 'border-ink bg-surface text-ink hover:bg-ink/10',
                ].join(' ')}
              >
                <span className="font-poster text-[13px] font-semibold uppercase leading-none">
                  {label}
                </span>
                {count != null && (
                  <span
                    className={[
                      'font-mono text-[11px] leading-none',
                      active ? 'text-paper/70' : count === 0 ? 'text-ink-muted/50' : 'text-ink-muted',
                    ].join(' ')}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
