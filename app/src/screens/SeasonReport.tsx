/**
 * SeasonReport — годовой отчёт участка (задача 33.1).
 *
 * Сводка за сезон (год): сколько посадок начато, сколько активно,
 * сколько погибло, урожаи по единицам, болезни/вредители/поливы.
 * Печать через window.print() — отдельный компактный layout для листа.
 */

import { useEffect, useState } from 'react';
import { getSeasonStats, type SeasonStats } from '../lib/pbStats';
import { SkipLink } from '../components/SkipLink';
import { SkeletonLines, LoadingAnnouncer } from '../components/Skeleton';
import { formatRuDate } from '../components/PlantingForm';

interface SeasonReportProps {
  gardenId: string;
  gardenName: string;
  onBack: () => void;
}

/** Строка сводки: подпись + число (задача 33.1) */
function StatRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between border-b border-ink/15 py-2">
      <span className="text-[15px] text-ink-muted">{label}</span>
      <span className="font-poster text-[18px] font-semibold text-ink">{value}</span>
    </div>
  );
}

export function SeasonReport({ gardenId, gardenName, onBack }: SeasonReportProps) {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [stats, setStats] = useState<SeasonStats | null | undefined>(undefined);
  useEffect(() => {
    setStats(undefined);
    getSeasonStats(gardenId, year)
      .then(setStats)
      .catch(() => setStats(null));
  }, [gardenId, year]);

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
            Годовой отчёт
          </h1>
          <button
            type="button"
            onClick={() => window.print()}
            className="ml-auto shrink-0 text-ink"
            aria-label="Распечатать отчёт"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" />
            </svg>
          </button>
        </header>

        <main id="main-content" className="mx-auto max-w-2xl p-4 pb-28">
          {/* Переключение года */}
          <div className="mb-4 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setYear((y) => y - 1)}
              className="rounded-lg p-2 text-ink hover:bg-ink/10"
              aria-label="Предыдущий год"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="font-poster text-[24px] font-semibold text-ink">{year}</span>
            <button
              type="button"
              onClick={() => setYear((y) => y + 1)}
              disabled={year >= new Date().getFullYear()}
              className="rounded-lg p-2 text-ink hover:bg-ink/10 disabled:opacity-30"
              aria-label="Следующий год"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {stats === undefined ? (
            <div className="mt-6">
              <LoadingAnnouncer />
              <SkeletonLines count={6} />
            </div>
          ) : stats === null ? (
            <p className="mt-20 text-center text-[15px] text-ink-muted">
              Участок не найден
            </p>
          ) : (
            <div className="rounded-[10px] border-2 border-ink bg-surface p-[5px] shadow-blank">
              <div className="rounded-[6px] border border-ink p-4">
                <StatRow label="Посадок начато" value={stats.plantingsStarted} />
                <StatRow label="Растёт сейчас" value={stats.plantingsActive} />
                <StatRow label="Погибло" value={stats.deaths} />
                <StatRow label="Записей урожая" value={stats.harvestCount} />
                {stats.harvestByUnit.map(({ unit, quantity }) => (
                  <StatRow key={unit} label={`Собрано, ${unit}`} value={quantity} />
                ))}
                <StatRow label="Болезней отмечено" value={stats.diseaseCount} />
                <StatRow label="Вредителей отмечено" value={stats.pestCount} />
                <StatRow label="Поливов записано" value={stats.wateringCount} />
                <StatRow label="Всего записей в журнале" value={stats.totalEventsInYear} />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Печатный layout (задача 33.1) — виден только в @media print */}
      {stats && (
        <div className="hidden p-8 font-mono text-black print:block">
          <h1 className="mb-1 font-poster text-[24px] font-semibold uppercase tracking-[0.03em]">
            Годовой отчёт — {year}
          </h1>
          <p className="mb-6 text-[14px] text-gray-600">{gardenName}</p>

          <table className="w-full border-collapse text-[14px]">
            <tbody>
              <tr className="border-b border-black/20">
                <td className="py-1.5">Посадок начато</td>
                <td className="py-1.5 text-right font-semibold">{stats.plantingsStarted}</td>
              </tr>
              <tr className="border-b border-black/20">
                <td className="py-1.5">Растёт сейчас</td>
                <td className="py-1.5 text-right font-semibold">{stats.plantingsActive}</td>
              </tr>
              <tr className="border-b border-black/20">
                <td className="py-1.5">Погибло</td>
                <td className="py-1.5 text-right font-semibold">{stats.deaths}</td>
              </tr>
              <tr className="border-b border-black/20">
                <td className="py-1.5">Записей урожая</td>
                <td className="py-1.5 text-right font-semibold">{stats.harvestCount}</td>
              </tr>
              {stats.harvestByUnit.map(({ unit, quantity }) => (
                <tr key={unit} className="border-b border-black/20">
                  <td className="py-1.5">Собрано, {unit}</td>
                  <td className="py-1.5 text-right font-semibold">{quantity}</td>
                </tr>
              ))}
              <tr className="border-b border-black/20">
                <td className="py-1.5">Болезней отмечено</td>
                <td className="py-1.5 text-right font-semibold">{stats.diseaseCount}</td>
              </tr>
              <tr className="border-b border-black/20">
                <td className="py-1.5">Вредителей отмечено</td>
                <td className="py-1.5 text-right font-semibold">{stats.pestCount}</td>
              </tr>
              <tr className="border-b border-black/20">
                <td className="py-1.5">Поливов записано</td>
                <td className="py-1.5 text-right font-semibold">{stats.wateringCount}</td>
              </tr>
            </tbody>
          </table>

          <p className="mt-8 text-[12px] text-gray-400">
            уДачный сад — распечатано {formatRuDate(Date.now())}
          </p>
        </div>
      )}
    </>
  );
}

export default SeasonReport;
