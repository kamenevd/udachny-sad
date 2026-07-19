/**
 * PlaceHistory — «Архивная справка» места (задача 5.5).
 *
 * Показывает все посадки на объекте схемы за все годы:
 * период (посажено → закончено), исход, растение.
 * Фильтр по году.
 *
 * DESIGN.md v5.1 §7 — «Что росло здесь (архивная справка)».
 */

import { useEffect, useMemo, useState } from 'react';
import { getHistory } from '../lib/pbPlantings';
import type { PlantingWithPlant } from '../lib/pbPlantings';
import { formatRuDate } from '../components/PlantingForm';
import { plantTypeLabel } from './Plants';
import { plantingStatusLabel } from './PlantingDetail';
import { objectTypeInfo } from '../components/canvas/EditorToolbar';
import { SkipLink } from '../components/SkipLink';
import { SkeletonList, LoadingAnnouncer } from '../components/Skeleton';
import { PlaceHistoryPrint } from './PlaceHistoryPrint';
import { AiAdvice } from '../components/AiAdvice';
import { TimelineScrubber, buildYearBuckets } from '../components/TimelineScrubber';
import { PlantHealthDiary } from '../components/PlantHealthDiary';

interface PlaceHistoryProps {
  schemaObjectId: string;
  onBack: () => void;
}

/** Год из timestamp или ISO-строки */
function yearOf(ts: number | string): number {
  return new Date(ts).getFullYear();
}

/** Расстановка исходов для отображения */
const OUTCOME_LABELS: Record<string, { icon: string; label: string }> = {
  active: { icon: '🌱', label: 'Растёт' },
  relocated: { icon: '🔄', label: 'Пересажено' },
  dead: { icon: '💀', label: 'Погибло' },
  completed: { icon: '✓', label: 'Завершено' },
};

export function PlaceHistory({ schemaObjectId, onBack }: PlaceHistoryProps) {
  const [history, setHistory] = useState<PlantingWithPlant[] | undefined>(undefined);
  useEffect(() => {
    setHistory(undefined);
    void getHistory(schemaObjectId).then(setHistory);
  }, [schemaObjectId]);
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');

  // Годовые корзины для шкалы времени (L.1).
  const buckets = useMemo(() => buildYearBuckets(history ?? []), [history]);

  const filtered = useMemo(() => {
    if (!history) return [];
    if (yearFilter === 'all') return history;
    return history.filter((p) => yearOf(p.plantedAt) === yearFilter);
  }, [history, yearFilter]);

  return (
    <>
      <SkipLink />
      <div className="print:hidden min-h-screen bg-paper">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b-2 border-ink bg-paper px-4 py-4">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 text-ink"
          aria-label="Назад"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1
          className="truncate font-poster text-[21px] uppercase tracking-[0.03em] text-ink"
          style={{ fontWeight: 700 }}
        >
          Архивная справка
        </h1>
        <button
          type="button"
          onClick={() => window.print()}
          className="ml-auto shrink-0 text-ink"
          aria-label="Распечатать справку"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
          </svg>
        </button>
      </header>

      <main id="main-content" className="mx-auto max-w-2xl p-4 pb-28">
        {history === undefined ? (
          <div className="mt-6">
            <LoadingAnnouncer />
            <SkeletonList count={3} />
          </div>
        ) : history.length === 0 ? (
          <div className="mt-20 text-center">
            <div className="mb-4 text-6xl">📜</div>
            <p className="mb-2 font-poster text-[21px] font-semibold uppercase text-ink">
              Здесь пока ничего не сажали
            </p>
            <p className="text-[17px] leading-[1.55] text-ink-muted">
              Посадите растение на этом месте — и история начнётся.
            </p>
          </div>
        ) : (
          <>
            {/* Совет ИИ-агронома (задача 32.1) */}
            <div className="mb-4">
              <AiAdvice schemaObjectId={schemaObjectId} />
            </div>

            {/* Дневник здоровья: сводка + AI-анализ болезней и севооборота (L.2) */}
            <div className="mb-4">
              <PlantHealthDiary schemaObjectId={schemaObjectId} plantings={history} />
            </div>

            {/* Шкала времени по годам (L.1) */}
            {buckets.length > 1 && (
              <TimelineScrubber
                buckets={buckets}
                selected={yearFilter}
                onSelect={setYearFilter}
              />
            )}

            {/* Список посадок */}
            <ul className="flex flex-col gap-3">
              {filtered.map((p) => {
                const outcome = OUTCOME_LABELS[p.status] ?? {
                  icon: '·',
                  label: plantingStatusLabel(p.status),
                };
                const period = `${formatRuDate(new Date(p.plantedAt).getTime())}${
                  p.endedAt ? ' — ' + formatRuDate(new Date(p.endedAt).getTime()) : ' — …'
                }`;
                return (
                  <li
                    key={p.id}
                    className="rounded-[10px] border-2 border-ink bg-surface p-[5px] shadow-blank"
                  >
                    <div className="rounded-[6px] border border-ink p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-poster text-[17px] font-semibold text-ink">
                            {p.plant?.name ?? 'Без названия'}
                            {p.plant?.variety
                              ? ` «${p.plant.variety}»`
                              : ''}
                          </p>
                          {p.plant && (
                            <p className="font-mono text-[13px] text-blueink">
                              {plantTypeLabel(p.plant.plantType)}
                              {p.quantity ? ` × ${p.quantity}` : ''}
                            </p>
                          )}
                        </div>
                        <span
                          className={
                            'shrink-0 rounded-[4px] border border-ink px-2 py-0.5 font-poster text-[12px] uppercase tracking-[0.04em] ' +
                            (p.status === 'dead' ? 'bg-red/10 text-red' : 'bg-paper text-ink')
                          }
                        >
                          {outcome.icon} {outcome.label}
                        </span>
                      </div>
                      <p className="mt-2 font-mono text-[14px] text-ink-muted">
                        {period}
                      </p>
                      {p.positionNote && (
                        <p className="mt-1 text-[15px] text-ink">
                          {p.positionNote}
                        </p>
                      )}
                      {p.notes && (
                        <p className="mt-1 text-[15px] leading-[1.5] text-ink-muted">
                          {p.notes}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {filtered.length === 0 && (
              <p className="mt-12 text-center text-[15px] text-ink-muted">
                За {yearFilter} год посадок на этом месте не было.
              </p>
            )}
          </>
        )}
      </main>
    </div>

    {/* Печатный layout (задача 31.2) — виден только в @media print */}
    <div className="hidden print:block">
      <PlaceHistoryPrint schemaObjectId={schemaObjectId} />
    </div>
    </>
  );
}

export default PlaceHistory;
