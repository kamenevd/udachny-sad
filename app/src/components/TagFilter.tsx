/**
 * TagFilter — чипы-теги условий для каталога растений (PLAN13 этап 4).
 *
 * Мульти-выбор: внутри категории — ИЛИ (солнце или полутень), между
 * категориями — И (солнечное И влаголюбивое). Цветовая кодировка по плану:
 * солнце — жёлтый (gold), тень — серый, влага — синий (blueink).
 *
 * Данные берутся из трейтов PLAN12 (plants.sun_exposure / plants.moisture) —
 * отдельных полей в схеме не понадобилось.
 */

import { SUN_EXPOSURES, MOISTURE_NEEDS } from '../types/plant';
import type { SunExposure, MoistureNeed, PlantTraits } from '../types/plant';

export interface TagFilterState {
  sun: SunExposure[];
  moisture: MoistureNeed[];
}

export const EMPTY_TAG_FILTER: TagFilterState = { sun: [], moisture: [] };

export function isTagFilterEmpty(state: TagFilterState): boolean {
  return state.sun.length === 0 && state.moisture.length === 0;
}

/**
 * Проходит ли растение фильтр. Растение без заполненного трейта не проходит
 * активный фильтр этой категории: «покажи теневыносливые» не должен
 * подсовывать растения, про которые ничего не известно.
 */
export function matchesTagFilter(plant: PlantTraits, state: TagFilterState): boolean {
  if (state.sun.length > 0 && (!plant.sun_exposure || !state.sun.includes(plant.sun_exposure))) {
    return false;
  }
  if (state.moisture.length > 0 && (!plant.moisture || !state.moisture.includes(plant.moisture))) {
    return false;
  }
  return true;
}

/** Классы чипа: активный — цвет категории, неактивный — контурный */
function chipClass(active: boolean, palette: 'sun' | 'shade' | 'moisture'): string {
  const base =
    'flex h-[36px] items-center gap-1 rounded-full border-2 px-3 font-mono text-[13px] transition-colors';
  if (!active) return `${base} border-ink/40 bg-surface text-ink-muted hover:border-ink`;
  switch (palette) {
    case 'sun':
      return `${base} border-ink bg-gold/30 text-ink`;
    case 'shade':
      return `${base} border-ink bg-ink/15 text-ink`;
    case 'moisture':
      return `${base} border-ink bg-blueink/20 text-ink`;
  }
}

/** Палитра чипа освещённости: солнце — жёлтая, полутень/тень — серая */
function sunPalette(value: SunExposure): 'sun' | 'shade' {
  return value === 'full_sun' ? 'sun' : 'shade';
}

interface TagFilterProps {
  state: TagFilterState;
  onChange: (state: TagFilterState) => void;
}

export function TagFilter({ state, onChange }: TagFilterProps) {
  const toggleSun = (value: SunExposure) => {
    onChange({
      ...state,
      sun: state.sun.includes(value)
        ? state.sun.filter((v) => v !== value)
        : [...state.sun, value],
    });
  };

  const toggleMoisture = (value: MoistureNeed) => {
    onChange({
      ...state,
      moisture: state.moisture.includes(value)
        ? state.moisture.filter((v) => v !== value)
        : [...state.moisture, value],
    });
  };

  return (
    <div role="group" aria-label="Фильтр по условиям" className="flex flex-wrap gap-1.5">
      {SUN_EXPOSURES.map((s) => (
        <button
          key={s.value}
          type="button"
          onClick={() => toggleSun(s.value)}
          aria-pressed={state.sun.includes(s.value)}
          className={chipClass(state.sun.includes(s.value), sunPalette(s.value))}
        >
          <span aria-hidden="true">{s.icon}</span>
          {s.label}
        </button>
      ))}
      {MOISTURE_NEEDS.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => toggleMoisture(m.value)}
          aria-pressed={state.moisture.includes(m.value)}
          className={chipClass(state.moisture.includes(m.value), 'moisture')}
        >
          <span aria-hidden="true">{m.icon}</span>
          {m.label}
        </button>
      ))}
    </div>
  );
}
