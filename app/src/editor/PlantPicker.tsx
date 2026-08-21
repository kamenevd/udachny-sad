/**
 * PlantPicker — посадка растения на выделенный объект прямо из редактора.
 *
 * Каталог растений пользователя с фильтрами по данным, которые уже есть:
 * месяц цветения (bloom_months) и освещение (sun_exposure). Если центр
 * объекта лежит в зоне света, фильтр по освещению включается сам —
 * «Это место в полутени». Посадка идёт через createPlanting — та же
 * функция, что и в остальном приложении (авто-событие журнала).
 */

import { useEffect, useMemo, useState } from 'react';
import { plants as plantsApi, type Plant } from '../lib/pb';
import { createPlanting } from '../lib/pbPlantings';
import { MONTHS_RU, SUN_EXPOSURES, plantTypeLabel, type SunExposure } from '../types/plant';
import type { ZoneCondition } from './model';

/** Условие зоны света → признак растения sun_exposure */
export function zoneToSun(condition: ZoneCondition): SunExposure {
  switch (condition) {
    case 'sunny':
      return 'full_sun';
    case 'partial_shade':
      return 'partial_shade';
    case 'shade':
      return 'full_shade';
  }
}

const ZONE_HINT: Record<ZoneCondition, string> = {
  sunny: 'Это место на солнце',
  partial_shade: 'Это место в полутени',
  shade: 'Это место в тени',
};

interface PlantPickerProps {
  open: boolean;
  gardenId: string;
  schemaObjectId: string;
  /** Зона света, в которую попадает объект (для автофильтра) */
  zoneCondition?: ZoneCondition | null;
  onClose: () => void;
  onPlanted: () => void;
}

export function PlantPicker({
  open,
  gardenId,
  schemaObjectId,
  zoneCondition,
  onClose,
  onPlanted,
}: PlantPickerProps) {
  const [plants, setPlants] = useState<Plant[] | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState<number | null>(null);
  const [sun, setSun] = useState<SunExposure | null>(null);
  const [picked, setPicked] = useState<Plant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setSearch('');
    setMonth(null);
    setSun(zoneCondition ? zoneToSun(zoneCondition) : null);
    setPicked(null);
    setQuantity(1);
    setError('');
    plantsApi
      .list({ sort: 'name' })
      .then(setPlants)
      .catch(() => setPlants([]));
  }, [open, zoneCondition]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('ru-RU');
    return (plants ?? [])
      .filter((p) => {
        if (q && !`${p.name} ${p.variety ?? ''}`.toLocaleLowerCase('ru-RU').includes(q)) return false;
        if (month !== null && !(Array.isArray(p.bloom_months) && p.bloom_months.includes(month))) return false;
        if (sun !== null && p.sun_exposure !== sun) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [plants, search, month, sun]);

  if (!open) return null;

  const handlePlant = async () => {
    if (!picked) return;
    setBusy(true);
    setError('');
    try {
      await createPlanting({
        gardenId,
        plantId: picked.id,
        schemaObjectId,
        plantedAt: new Date().toISOString(),
        quantity,
      });
      onPlanted();
      onClose();
    } catch {
      setError('Не получилось сохранить посадку. Попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  };

  const bloomShort = (p: Plant) =>
    Array.isArray(p.bloom_months) && p.bloom_months.length > 0
      ? p.bloom_months
          .slice()
          .sort((a, b) => a - b)
          .map((m) => MONTHS_RU[m - 1])
          .join(', ')
      : null;

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center sm:items-center" data-testid="plant-picker">
      <button type="button" aria-label="Закрыть" className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div className="relative flex max-h-[86dvh] w-full max-w-md animate-sheet-up flex-col rounded-t-[14px] border-2 border-b-0 border-ink bg-paper shadow-blank sm:max-h-[80vh] sm:rounded-[14px] sm:border-b-2">
        {/* Шапка */}
        <div className="flex items-center justify-between border-b-2 border-ink/15 px-4 py-3">
          <span className="font-poster text-[17px] font-semibold uppercase text-ink">
            Что посадить?
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-ink hover:bg-ink/10"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          {/* Подсказка от зоны света */}
          {zoneCondition && (
            <p className="rounded-[8px] border border-ink/25 bg-surface px-3 py-2 font-mono text-[13px] text-ink-muted">
              {ZONE_HINT[zoneCondition]} — фильтр по освещению включён.
            </p>
          )}

          <input
            data-testid="plant-search"
            className="h-11 rounded-[8px] border-2 border-ink bg-surface px-3 font-mono text-[15px] text-ink outline-none"
            placeholder="Поиск: роза, хоста…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {/* Фильтр: освещение */}
          <div className="flex gap-1 rounded-[8px] border-2 border-ink bg-surface p-1">
            {SUN_EXPOSURES.map((s) => (
              <button
                key={s.value}
                type="button"
                data-testid={`sun-${s.value}`}
                onClick={() => setSun(sun === s.value ? null : s.value)}
                className={[
                  'flex min-h-[40px] flex-1 items-center justify-center gap-1 rounded-[6px] px-1 font-mono text-[12px]',
                  sun === s.value ? 'bg-ink text-paper' : 'text-ink hover:bg-ink/10',
                ].join(' ')}
              >
                <span aria-hidden="true">{s.icon}</span>
                {s.label}
              </button>
            ))}
          </div>

          {/* Фильтр: месяц цветения */}
          <div className="flex flex-wrap gap-1">
            {MONTHS_RU.map((m, i) => (
              <button
                key={m}
                type="button"
                onClick={() => setMonth(month === i + 1 ? null : i + 1)}
                className={[
                  'min-h-[36px] rounded-[6px] border border-ink px-2 font-mono text-[12px]',
                  month === i + 1 ? 'bg-ink text-paper' : 'bg-surface text-ink hover:bg-ink/10',
                ].join(' ')}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Список растений */}
          {plants === undefined ? (
            <p className="py-6 text-center font-mono text-[14px] text-ink-muted">Загрузка…</p>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center font-mono text-[14px] leading-relaxed text-ink-muted">
              {plants.length === 0
                ? 'Справочник растений пуст. Добавьте растения на экране «Растения».'
                : 'Ничего не подошло — попробуйте снять фильтры.'}
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {filtered.map((p) => {
                const bloom = bloomShort(p);
                const sunDef = SUN_EXPOSURES.find((s) => s.value === p.sun_exposure);
                const active = picked?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    data-plant-name={p.name}
                    onClick={() => setPicked(active ? null : p)}
                    className={[
                      'flex flex-col gap-0.5 rounded-[8px] border-2 px-3 py-2 text-left',
                      active
                        ? 'border-ink bg-ink text-paper'
                        : 'border-ink/30 bg-surface text-ink hover:border-ink',
                    ].join(' ')}
                  >
                    <span className="text-[15px] font-medium">
                      {p.name}
                      {p.variety ? ` «${p.variety}»` : ''}
                    </span>
                    <span className={`font-mono text-[12px] ${active ? 'text-paper/75' : 'text-ink-muted'}`}>
                      {plantTypeLabel(p.plantType)}
                      {sunDef ? ` · ${sunDef.icon} ${sunDef.label}` : ''}
                      {bloom ? ` · цветёт: ${bloom}` : ''}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Подтверждение */}
        {picked && (
          <div className="border-t-2 border-ink bg-paper p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            {error && <p className="mb-2 font-mono text-[13px] text-red">{error}</p>}
            <div className="flex items-center gap-3">
              <div className="flex h-12 items-stretch overflow-hidden rounded-[8px] border-2 border-ink bg-surface">
                <button
                  type="button"
                  aria-label="Меньше"
                  className="w-11 border-r-2 border-ink font-poster text-[18px] font-semibold text-ink hover:bg-ink/10"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  −
                </button>
                <span className="flex w-12 items-center justify-center font-mono text-[16px] text-ink">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Больше"
                  className="w-11 border-l-2 border-ink font-poster text-[18px] font-semibold text-ink hover:bg-ink/10"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                data-testid="plant-confirm"
                disabled={busy}
                onClick={() => void handlePlant()}
                className="h-12 min-w-0 flex-1 rounded-[8px] border-2 border-ink bg-green font-poster text-[15px] font-semibold uppercase text-paper hover:opacity-90 disabled:opacity-60"
              >
                {busy ? 'Сажаем…' : 'Посадить'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
