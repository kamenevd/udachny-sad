/**
 * Inspector — свойства выделенного элемента.
 * Десктоп (≥900px) — панель справа, план не перекрыт.
 * Мобильный — нижняя шторка, план виден выше неё.
 *
 * Точные размеры цифрами: степперы ±0,5 м, ввод с клавиатуры (запятая
 * и точка равнозначны). Поворот — кнопками ±15° / ±90°.
 */

import { useEffect, useState } from 'react';
import type { EditorItem, EditorObject, EditorZone } from './model';
import { objectTypeDef, ZONE_CONDITION_DEFS, toggleRectCircle } from './model';
import {
  type Shape,
  type LineShape,
  normalizeAngle,
  round2,
  MIN_SIZE,
  GRID,
} from './geometry';
import { extendLine } from './model';
import type { PlantingWithPlant } from '../lib/pbPlantings';
import { fmtM } from './EditorCanvas';

interface InspectorProps {
  item: EditorItem;
  variant: 'panel' | 'sheet';
  plantings: PlantingWithPlant[];
  /** Правка нечисловых полей (label, condition) */
  onPatch: (patch: Partial<EditorObject> & Partial<EditorZone>) => void;
  onShape: (shape: Shape) => void;
  onDelete: () => void;
  onPlant: () => void;
  onClose: () => void;
  error?: string | null;
}

// ─── Числовое поле со степпером ─────────────────────────────────────────

function parseM(text: string): number | null {
  const v = parseFloat(text.replace(',', '.').replace(/[^\d.-]/g, ''));
  return Number.isFinite(v) ? v : null;
}

function NumberField({
  label,
  value,
  min = MIN_SIZE,
  step = GRID,
  unit = 'м',
  testId,
  onCommit,
}: {
  label: string;
  value: number;
  min?: number;
  step?: number;
  unit?: string;
  testId: string;
  onCommit: (v: number) => void;
}) {
  const [text, setText] = useState(fmtM(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setText(fmtM(value));
  }, [value, editing]);

  const commitText = () => {
    setEditing(false);
    const v = parseM(text);
    if (v !== null && v >= min) onCommit(round2(v));
    else setText(fmtM(value));
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="font-mono text-[12px] text-ink-muted">{label}</span>
      <div className="flex h-11 items-stretch overflow-hidden rounded-[8px] border-2 border-ink bg-surface">
        <button
          type="button"
          aria-label={`${label}: меньше`}
          data-testid={`${testId}-dec`}
          className="w-11 shrink-0 border-r-2 border-ink font-poster text-[18px] font-semibold text-ink hover:bg-ink/10 active:bg-ink/15"
          onClick={() => onCommit(round2(Math.max(min, value - step)))}
        >
          −
        </button>
        <div className="relative min-w-0 flex-1">
          <input
            data-testid={testId}
            className="h-full w-full bg-transparent pr-6 text-center font-mono text-[16px] text-ink outline-none"
            inputMode="decimal"
            value={text}
            onFocus={() => setEditing(true)}
            onChange={(e) => setText(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
          <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 font-mono text-[12px] text-ink-muted">
            {unit}
          </span>
        </div>
        <button
          type="button"
          aria-label={`${label}: больше`}
          data-testid={`${testId}-inc`}
          className="w-11 shrink-0 border-l-2 border-ink font-poster text-[18px] font-semibold text-ink hover:bg-ink/10 active:bg-ink/15"
          onClick={() => onCommit(round2(value + step))}
        >
          +
        </button>
      </div>
    </div>
  );
}

// ─── Инспектор ──────────────────────────────────────────────────────────

export function Inspector({
  item,
  variant,
  plantings,
  onPatch,
  onShape,
  onDelete,
  onPlant,
  onClose,
  error,
}: InspectorProps) {
  const isObject = item.kind === 'object';
  const def = isObject ? objectTypeDef(item.type) : null;
  const zoneDef = !isObject
    ? ZONE_CONDITION_DEFS.find((z) => z.condition === (item as EditorZone).condition)
    : null;

  const [label, setLabel] = useState(isObject ? ((item as EditorObject).label ?? '') : '');
  useEffect(() => {
    setLabel(isObject ? ((item as EditorObject).label ?? '') : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const shape = item.shape;

  const content = (
    <div className="flex flex-col gap-3" data-testid="inspector">
      {/* Заголовок */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[22px]" aria-hidden="true">
            {isObject ? def!.icon : zoneDef?.icon}
          </span>
          <span className="truncate font-poster text-[16px] font-semibold uppercase text-ink">
            {isObject ? def!.label : `Зона: ${zoneDef?.label ?? ''}`}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Закрыть"
          data-testid="inspector-close"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-ink/10"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Название объекта */}
      {isObject && (
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[12px] text-ink-muted">Название</span>
          <input
            data-testid="inspector-label"
            className="h-11 rounded-[8px] border-2 border-ink bg-surface px-3 font-mono text-[15px] text-ink outline-none"
            placeholder={def!.label}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => onPatch({ label: label.trim() || undefined })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        </div>
      )}

      {/* Условие зоны */}
      {!isObject && (
        <div className="flex gap-1 rounded-[8px] border-2 border-ink bg-surface p-1">
          {ZONE_CONDITION_DEFS.map((z) => (
            <button
              key={z.condition}
              type="button"
              onClick={() => onPatch({ condition: z.condition })}
              className={[
                'flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-[6px] px-1 font-mono text-[13px]',
                (item as EditorZone).condition === z.condition
                  ? 'bg-ink text-paper'
                  : 'text-ink hover:bg-ink/10',
              ].join(' ')}
            >
              <span aria-hidden="true">{z.icon}</span>
              {z.label}
            </button>
          ))}
        </div>
      )}

      {/* Переключатель формы */}
      {isObject && def!.shapeSwitch && (shape.kind === 'rect' || shape.kind === 'circle') && (
        <div className="flex gap-1 rounded-[8px] border-2 border-ink bg-surface p-1">
          {(
            [
              { kind: 'rect', label: '▭ Прямоугольник' },
              { kind: 'circle', label: '◯ Круг' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.kind}
              type="button"
              data-testid={`shape-${opt.kind}`}
              onClick={() => {
                if (shape.kind !== opt.kind) onShape(toggleRectCircle(shape));
              }}
              className={[
                'min-h-[44px] flex-1 rounded-[6px] px-1 font-mono text-[13px]',
                shape.kind === opt.kind ? 'bg-ink text-paper' : 'text-ink hover:bg-ink/10',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Размеры */}
      {shape.kind === 'rect' && (
        <>
          <div className="flex gap-2">
            <NumberField
              label="Ширина"
              value={shape.w}
              testId="field-w"
              onCommit={(w) => onShape({ ...shape, w })}
            />
            <NumberField
              label="Глубина"
              value={shape.h}
              testId="field-h"
              onCommit={(h) => onShape({ ...shape, h })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="font-mono text-[12px] text-ink-muted">
              Поворот: {Math.round(normalizeAngle(shape.rot))}°
            </span>
            <div className="flex gap-1">
              {[
                { d: -90, label: '−90°' },
                { d: -15, label: '−15°' },
                { d: 15, label: '+15°' },
                { d: 90, label: '+90°' },
              ].map((b) => (
                <button
                  key={b.d}
                  type="button"
                  data-testid={`rot${b.d > 0 ? '+' : ''}${b.d}`}
                  onClick={() => onShape({ ...shape, rot: normalizeAngle(shape.rot + b.d) })}
                  className="min-h-[44px] flex-1 rounded-[8px] border-2 border-ink bg-surface font-mono text-[14px] text-ink hover:bg-ink/10 active:bg-ink/15"
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {shape.kind === 'circle' && (
        <NumberField
          label="Диаметр"
          value={round2(shape.r * 2)}
          testId="field-d"
          onCommit={(d) => onShape({ ...shape, r: round2(Math.max(MIN_SIZE, d) / 2) })}
        />
      )}

      {shape.kind === 'line' && (
        <>
          <NumberField
            label={item.kind === 'object' && (item as EditorObject).type === 'hedge' ? 'Толщина' : 'Ширина'}
            value={shape.width}
            min={0.2}
            testId="field-width"
            onCommit={(width) => onShape({ ...shape, width })}
          />
          <div className="flex gap-1">
            <button
              type="button"
              data-testid="line-add-point"
              onClick={() => onShape(extendLine(shape as LineShape))}
              className="min-h-[44px] flex-1 rounded-[8px] border-2 border-ink bg-surface font-mono text-[14px] text-ink hover:bg-ink/10"
            >
              + Точка
            </button>
            <button
              type="button"
              data-testid="line-del-point"
              disabled={shape.pts.length <= 2}
              onClick={() => onShape({ ...shape, pts: shape.pts.slice(0, -1) })}
              className="min-h-[44px] flex-1 rounded-[8px] border-2 border-ink bg-surface font-mono text-[14px] text-ink hover:bg-ink/10 disabled:opacity-40"
            >
              − Точка
            </button>
          </div>
        </>
      )}

      {shape.kind === 'poly' && (
        <p className="rounded-[8px] border border-ink/30 bg-surface px-3 py-2 font-mono text-[13px] leading-snug text-ink-muted">
          Объект со старого плана: его можно двигать и удалять. Размеры
          редактируются у объектов, добавленных в новом редакторе.
        </p>
      )}

      {/* Посадки */}
      {isObject && def!.plantable && (
        <div className="flex flex-col gap-2 border-t-2 border-ink/15 pt-3">
          {plantings.length > 0 && (
            <div className="flex max-h-28 flex-col gap-1 overflow-y-auto">
              {plantings.map((p) => (
                <div
                  key={p.id}
                  className="flex items-baseline justify-between rounded-[6px] bg-surface px-2 py-1.5"
                >
                  <span className="truncate text-[14px] text-ink">
                    🌱 {p.plant?.name ?? 'Растение'}
                    {p.plant?.variety ? ` «${p.plant.variety}»` : ''}
                  </span>
                  {p.quantity ? (
                    <span className="ml-2 shrink-0 font-mono text-[12px] text-ink-muted">
                      × {p.quantity}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            data-testid="inspector-plant"
            onClick={onPlant}
            className="min-h-[46px] w-full rounded-[8px] border-2 border-ink bg-green font-poster text-[14px] font-semibold uppercase tracking-[0.03em] text-paper hover:opacity-90"
          >
            🌸 Посадить растение
          </button>
        </div>
      )}

      {error && <p className="font-mono text-[13px] leading-snug text-red">{error}</p>}

      <button
        type="button"
        data-testid="inspector-delete"
        onClick={onDelete}
        className="min-h-[44px] w-full rounded-[8px] border-2 border-red bg-paper font-poster text-[13px] font-semibold uppercase text-red hover:bg-red/10"
      >
        Удалить с плана
      </button>
    </div>
  );

  if (variant === 'panel') {
    return (
      <aside className="w-[300px] shrink-0 overflow-y-auto border-l-2 border-ink bg-paper p-3">
        {content}
      </aside>
    );
  }
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 max-h-[46dvh] animate-sheet-up overflow-y-auto border-t-2 border-ink bg-paper p-3 pb-[max(12px,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-md">{content}</div>
    </div>
  );
}
