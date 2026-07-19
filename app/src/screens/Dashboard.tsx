/**
 * Dashboard — экран статистики (PLAN6 задача 35.2).
 *
 * Сводка по всем участкам пользователя: всего растений в справочнике,
 * активных посадок, цветений за текущий год, стрик записей в журнале.
 * Данные — через PocketBase (lib/pb.ts, lib/pbStats.ts), без Convex
 * (см. lib/pbStats.ts — агрегации считаются на клиенте).
 */

import { useEffect, useState } from 'react';
import { gardens as gardensApi, plants as plantsApi, plantings as plantingsApi } from '../lib/pb';
import { getStreakForGardens, getSeasonStats, type StreakResult } from '../lib/pbStats';
import { SkipLink } from '../components/SkipLink';
import { SkeletonLines, LoadingAnnouncer } from '../components/Skeleton';

interface DashboardProps {
  onBack: () => void;
}

function StatRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between border-b border-ink/15 py-2">
      <span className="text-[15px] text-ink-muted">{label}</span>
      <span className="font-poster text-[18px] font-semibold text-ink">{value}</span>
    </div>
  );
}

interface DashboardStats {
  totalPlants: number;
  activePlantings: number;
  bloomsThisYear: number;
  streak: StreakResult;
}

async function loadDashboardStats(): Promise<DashboardStats> {
  const [gardens, plants] = await Promise.all([
    gardensApi.list({ sort: '-created' }),
    plantsApi.list(),
  ]);
  const gardenIds = gardens.map((g) => g.id);

  const plantingsPerGarden = await Promise.all(
    gardenIds.map((id) => plantingsApi.list({ filter: `gardenId="${id}"` })),
  );
  const activePlantings = plantingsPerGarden
    .flat()
    .filter((p) => p.status === 'active').length;

  const year = new Date().getFullYear();
  const seasonStatsPerGarden = await Promise.all(
    gardenIds.map((id) => getSeasonStats(id, year)),
  );
  const bloomsThisYear = seasonStatsPerGarden.reduce(
    (sum, s) => sum + (s?.bloomingCount ?? 0),
    0,
  );

  const streak = await getStreakForGardens(gardenIds);

  return { totalPlants: plants.length, activePlantings, bloomsThisYear, streak };
}

export function Dashboard({ onBack }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null | undefined>(undefined);

  useEffect(() => {
    setStats(undefined);
    loadDashboardStats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  return (
    <>
      <SkipLink />
      <div className="min-h-screen bg-paper">
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
            Дашборд
          </h1>
        </header>

        <main id="main-content" className="mx-auto max-w-2xl p-4 pb-28">
          {stats === undefined ? (
            <div className="mt-6">
              <LoadingAnnouncer />
              <SkeletonLines count={4} />
            </div>
          ) : stats === null ? (
            <p className="mt-20 text-center text-[15px] text-ink-muted">
              Не получилось загрузить статистику
            </p>
          ) : (
            <div className="rounded-[10px] border-2 border-ink bg-surface p-[5px] shadow-blank">
              <div className="rounded-[6px] border border-ink p-4">
                <StatRow label="Растений в справочнике" value={stats.totalPlants} />
                <StatRow label="Активных посадок" value={stats.activePlantings} />
                <StatRow label="Цветений в этом году" value={stats.bloomsThisYear} />
                <StatRow
                  label="Дней подряд с записями"
                  value={stats.streak.days}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export default Dashboard;
