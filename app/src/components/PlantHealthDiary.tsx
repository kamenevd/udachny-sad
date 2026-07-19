/**
 * PlantHealthDiary — «Дневник здоровья растения» (PLAN9 задача L.2).
 *
 * Агрегирует историю посадок места: локально считает статистику (сколько
 * посадок погибло, доля потерь, монокультуры-риски для севооборота) и
 * показывает её сразу, без сети. Кнопкой запрашивает у ИИ-агронома развёрнутый
 * анализ паттернов болезней за сезон и рекомендации по севообороту
 * (`lib/ai.getHealthDiary`).
 */
import { useMemo, useState } from 'react';
import { getHealthDiary } from '../lib/ai';
import { plantTypeLabel } from '../screens/Plants';
import { Button } from './Button';

/** Минимальная форма посадки, нужная для сводки (совместима с PlantingWithPlant). */
export interface HealthPlanting {
  status: string;
  plantedAt: number | string;
  plant?: { name: string; plantType: string } | null;
}

export interface HealthSummary {
  total: number;
  dead: number;
  /** Доля погибших, % (целое). */
  mortalityPct: number;
  /** Типы растений, посаженные в ≥2 разных годах на этом месте (риск севооборота). */
  monocultureTypes: string[];
}

/** Чистая агрегация истории места — покрыта тестами. */
export function summarizeHealth(plantings: HealthPlanting[]): HealthSummary {
  const total = plantings.length;
  const dead = plantings.filter((p) => p.status === 'dead').length;
  const mortalityPct = total === 0 ? 0 : Math.round((dead / total) * 100);

  // Типы, встречающиеся в нескольких разных годах → монокультура.
  const yearsByType = new Map<string, Set<number>>();
  for (const p of plantings) {
    const type = p.plant?.plantType;
    if (!type) continue;
    const year = new Date(p.plantedAt).getFullYear();
    if (!yearsByType.has(type)) yearsByType.set(type, new Set());
    yearsByType.get(type)!.add(year);
  }
  const monocultureTypes = Array.from(yearsByType.entries())
    .filter(([, years]) => years.size >= 2)
    .map(([type]) => type);

  return { total, dead, mortalityPct, monocultureTypes };
}

interface PlantHealthDiaryProps {
  schemaObjectId: string;
  plantings: HealthPlanting[];
}

export function PlantHealthDiary({ schemaObjectId, plantings }: PlantHealthDiaryProps) {
  const summary = useMemo(() => summarizeHealth(plantings), [plantings]);
  const [diary, setDiary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClick = async () => {
    setLoading(true);
    setError('');
    try {
      setDiary(await getHealthDiary(schemaObjectId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не получилось собрать дневник');
    } finally {
      setLoading(false);
    }
  };

  if (summary.total === 0) return null;

  return (
    <div className="rounded-[10px] border-2 border-ink bg-surface p-[5px] shadow-blank">
      <div className="rounded-[6px] border border-ink p-4">
        <p className="mb-3 font-poster text-[13px] uppercase tracking-[0.05em] text-ink-muted">
          🩺 Дневник здоровья
        </p>

        {/* Локальная сводка — видна сразу, без ИИ */}
        <div className="mb-3 flex flex-col gap-1 font-mono text-[14px] text-ink">
          <p>
            Всего посадок: {summary.total}, погибло: {summary.dead} ({summary.mortalityPct}%)
          </p>
          {summary.monocultureTypes.length > 0 && (
            <p className="text-red">
              ⚠️ Севооборот: {summary.monocultureTypes.map(plantTypeLabel).join(', ')} сажали
              здесь несколько лет подряд
            </p>
          )}
        </div>

        {diary ? (
          <p className="whitespace-pre-line text-[15px] leading-[1.5] text-ink">{diary}</p>
        ) : (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => void handleClick()}
            disabled={loading}
          >
            {loading ? 'Собираем…' : 'Анализ ИИ: болезни и севооборот'}
          </Button>
        )}
        {error && <p className="mt-2 font-mono text-[13px] text-red">{error}</p>}
      </div>
    </div>
  );
}

export default PlantHealthDiary;
