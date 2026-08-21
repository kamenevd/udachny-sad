/**
 * AddMenu — меню «Добавить»: крупные плитки типов объектов и зон света.
 * Объект не рисуется, а СТАВИТСЯ: тап по плитке сразу создаёт объект
 * стандартного размера в центре экрана, выделенный и готовый к правке.
 */

import { OBJECT_TYPE_DEFS, ZONE_CONDITION_DEFS, type ZoneCondition } from './model';
import type { SchemaObjectType } from '../lib/pb';

interface AddMenuProps {
  open: boolean;
  onClose: () => void;
  onAddObject: (type: SchemaObjectType) => void;
  onAddZone: (condition: ZoneCondition) => void;
}

export function AddMenu({ open, onClose, onAddObject, onAddZone }: AddMenuProps) {
  if (!open) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center sm:items-center" data-testid="add-menu">
      <button
        type="button"
        aria-label="Закрыть меню"
        className="absolute inset-0 bg-ink/30"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md animate-sheet-up rounded-t-[14px] border-2 border-b-0 border-ink bg-paper p-4 shadow-blank sm:rounded-[14px] sm:border-b-2">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-poster text-[17px] font-semibold uppercase text-ink">
            Что добавить?
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

        <div className="grid max-h-[46vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
          {OBJECT_TYPE_DEFS.filter((d) => !d.hidden).map((d) => (
            <button
              key={d.type}
              type="button"
              data-add-type={d.type}
              onClick={() => onAddObject(d.type)}
              className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-[10px] border-2 border-ink bg-surface px-1 py-2 text-ink transition-colors hover:bg-ink/10 active:bg-ink/15"
            >
              <span className="text-[26px] leading-none" aria-hidden="true">{d.icon}</span>
              <span className="font-mono text-[12px] leading-tight">{d.label}</span>
            </button>
          ))}
        </div>

        <p className="mb-2 mt-4 font-poster text-[13px] font-semibold uppercase tracking-[0.05em] text-ink-muted">
          Зоны света
        </p>
        <div className="grid grid-cols-3 gap-2">
          {ZONE_CONDITION_DEFS.map((z) => (
            <button
              key={z.condition}
              type="button"
              data-add-zone={z.condition}
              onClick={() => onAddZone(z.condition)}
              className="flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-[10px] border-2 border-dashed border-ink bg-surface px-1 py-2 text-ink transition-colors hover:bg-ink/10 active:bg-ink/15"
            >
              <span className="text-[20px] leading-none" aria-hidden="true">{z.icon}</span>
              <span className="font-mono text-[12px] leading-tight">{z.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
