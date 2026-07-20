/**
 * PLAN12 задача 9 — выбор и применение шаблона клумбы к объекту схемы.
 *
 * Показывает шаблоны, подходящие типу объекта (миксбордер для клумбы,
 * бордюр для дорожки и т.д.), раскрывает состав по ярусам и по подтверждению
 * создаёт посадки внутри объекта (lib/applyBedTemplate.ts).
 */

import { useMemo, useState } from 'react';
import { BED_TEMPLATES, BED_TIERS, templatesForObjectType, templateTotalCount } from '../../data/bedTemplates';
import type { BedTemplate } from '../../data/bedTemplates';
import { catalogById } from '../../data/plantCatalog';
import { applyBedTemplate } from '../../lib/applyBedTemplate';
import { Button } from '../Button';

interface BedTemplatePickerProps {
  open: boolean;
  gardenId: string;
  schemaObjectId: string;
  /** Тип объекта схемы — отбирает подходящие шаблоны */
  objectType: string;
  onClose: () => void;
  /** Шаблон применён: сколько посадок создано */
  onApplied?: (created: number) => void;
}

export function BedTemplatePicker({
  open, gardenId, schemaObjectId, objectType, onClose, onApplied,
}: BedTemplatePickerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Для нетипичных объектов (газон, строение) подходящих шаблонов нет —
  // показываем все, решение остаётся за пользователем.
  const templates = useMemo(() => {
    const matching = templatesForObjectType(objectType);
    return matching.length > 0 ? matching : BED_TEMPLATES;
  }, [objectType]);

  const selected: BedTemplate | undefined = templates.find((t) => t.id === selectedId);

  if (!open) return null;

  const handleApply = async () => {
    if (!selected) return;
    setError('');
    setBusy(true);
    try {
      const { created } = await applyBedTemplate({
        template: selected,
        gardenId,
        schemaObjectId,
      });
      onApplied?.(created);
      setSelectedId(null);
      onClose();
    } catch {
      setError('Не получилось применить шаблон. Проверьте связь и попробуйте ещё раз.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Шаблоны клумб"
    >
      <div className="max-h-[92dvh] w-full max-w-lg overflow-hidden rounded-t-[10px] border-2 border-ink bg-paper p-[5px] shadow-blank sm:rounded-[10px]">
        <div className="flex max-h-[calc(92dvh-10px)] flex-col rounded-[6px] border border-ink">
          <div className="flex shrink-0 items-center justify-between gap-2 border-b-2 border-ink px-4 py-3">
            <h2 className="font-poster text-[20px] font-semibold uppercase tracking-[0.03em] text-ink">
              Шаблон клумбы
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="rounded-lg p-1 text-ink transition-colors hover:bg-ink/10"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="flex flex-col gap-2">
              {templates.map((t) => {
                const active = selectedId === t.id;
                return (
                  <div key={t.id}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedId(active ? null : t.id)}
                      className={[
                        'flex w-full items-center gap-3 rounded-[8px] border-2 border-ink p-3 text-left transition-colors',
                        active ? 'bg-ink text-paper' : 'bg-surface text-ink hover:bg-ink/10',
                      ].join(' ')}
                    >
                      <span className="text-[26px] leading-none" aria-hidden="true">{t.icon}</span>
                      <span className="flex-1">
                        <span className="block font-poster text-[16px] font-semibold uppercase">
                          {t.name}
                        </span>
                        <span
                          className={[
                            'block font-mono text-[12px]',
                            active ? 'text-paper/70' : 'text-ink-muted',
                          ].join(' ')}
                        >
                          {t.entries.length} видов · {templateTotalCount(t)} саженцев
                        </span>
                      </span>
                    </button>

                    {/* Состав по ярусам — раскрывается у выбранного шаблона */}
                    {active && (
                      <div className="mt-2 rounded-[8px] border-2 border-ink bg-surface p-3">
                        <p className="mb-3 text-[14px] leading-[1.5] text-ink">
                          {t.description}
                        </p>
                        {BED_TIERS.map(({ tier, label }) => {
                          const entries = t.entries.filter((e) => e.tier === tier);
                          if (entries.length === 0) return null;
                          return (
                            <div key={tier} className="mb-2 last:mb-0">
                              <p className="font-mono text-[12px] uppercase tracking-[0.06em] text-ink-muted">
                                {label}
                              </p>
                              <ul className="mt-1 flex flex-col gap-1">
                                {entries.map((e) => {
                                  const plant = catalogById(e.catalogId);
                                  return (
                                    <li
                                      key={e.catalogId}
                                      className="flex items-center gap-2 text-[14px] text-ink"
                                    >
                                      {plant && (
                                        <span
                                          aria-hidden="true"
                                          className="h-2.5 w-2.5 shrink-0 rounded-full border border-ink"
                                          style={{ backgroundColor: plant.primaryColor }}
                                        />
                                      )}
                                      <span className="flex-1 truncate">
                                        {plant?.name ?? e.catalogId}
                                      </span>
                                      <span className="shrink-0 font-mono text-[12px] text-blueink">
                                        × {e.quantity}
                                      </span>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {error && <p className="mt-3 font-mono text-[14px] text-red">{error}</p>}
          </div>

          <div className="shrink-0 border-t-2 border-ink px-4 py-3">
            <Button
              variant="primary"
              className="w-full"
              disabled={!selected || busy}
              onClick={() => void handleApply()}
            >
              {busy
                ? 'Применяем…'
                : selected
                  ? `Применить «${selected.name}»`
                  : 'Выберите шаблон'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
