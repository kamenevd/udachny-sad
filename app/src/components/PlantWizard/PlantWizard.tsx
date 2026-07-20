/**
 * PLAN12 задача 8 — мастер подбора растений.
 *
 * Пять шагов: тип клумбы → освещение → почва → влага/высота → цветовая гамма,
 * затем ранжированный список из справочника (matchPlants.ts). Каждый шаг —
 * сетка карточек с emoji в стиле бланка (border-ink, bg-surface, активная
 * карточка инвертируется в bg-ink), как выбор типа объекта в EditorToolbar.
 *
 * Мастер ничего не сохраняет сам: результат уходит в `onPick`, а экран решает,
 * что с ним делать (открыть форму посадки, применить шаблон и т.д.).
 */

import { useMemo, useState } from 'react';
import { BED_TEMPLATES } from '../../data/bedTemplates';
import type { CatalogPlant } from '../../data/plantCatalog';
import {
  COLOR_FAMILIES, HEIGHT_BANDS, matchPlants,
  type ColorFamily, type HeightBand, type WizardCriteria,
} from './matchPlants';
import {
  MOISTURE_NEEDS, SOIL_TYPES, SUN_EXPOSURES,
  type MoistureNeed, type SoilType, type SunExposure,
} from '../../types/plant';
import { monthLabel } from '../../types/plant';

interface PlantWizardProps {
  open: boolean;
  onClose: () => void;
  /** Выбор растения в результатах — например, открыть форму посадки */
  onPick?: (plant: CatalogPlant) => void;
  /** Предзаполнить шаг «тип клумбы» (вызов из карточки объекта схемы) */
  initialTemplateId?: string;
}

const STEP_TITLES = [
  'Что сажаем?',
  'Сколько там света?',
  'Какая почва?',
  'Влага и высота',
  'Цветовая гамма',
  'Что подошло',
];

/** Карточка-вариант: emoji + подпись, как кнопки типов объектов на канвасе */
function ChoiceCard({
  icon, label, active, onClick,
}: {
  icon: string; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-[8px]',
        'border-2 border-ink px-2 py-2 text-center transition-colors',
        active ? 'bg-ink text-paper' : 'bg-surface text-ink hover:bg-ink/10',
      ].join(' ')}
    >
      <span className="text-[24px] leading-none" aria-hidden="true">{icon}</span>
      <span className="font-mono text-[12px] leading-tight">{label}</span>
    </button>
  );
}

export function PlantWizard({ open, onClose, onPick, initialTemplateId }: PlantWizardProps) {
  const [step, setStep] = useState(0);
  const [criteria, setCriteria] = useState<WizardCriteria>({
    templateId: initialTemplateId,
  });

  const results = useMemo(
    () => (step === 5 ? matchPlants(criteria) : []),
    [step, criteria],
  );

  if (!open) return null;

  const patch = (next: Partial<WizardCriteria>) =>
    setCriteria((c) => ({ ...c, ...next }));

  /** Выбор варианта сразу ведёт на следующий шаг — меньше лишних тапов */
  const pick = (next: Partial<WizardCriteria>) => {
    patch(next);
    setStep((s) => Math.min(s + 1, 5));
  };

  const close = () => {
    setStep(0);
    setCriteria({ templateId: initialTemplateId });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Мастер подбора растений"
    >
      <div className="max-h-[92dvh] w-full max-w-lg overflow-hidden rounded-t-[10px] border-2 border-ink bg-paper p-[5px] shadow-blank sm:rounded-[10px]">
        <div className="flex max-h-[calc(92dvh-10px)] flex-col rounded-[6px] border border-ink">
          {/* Шапка с прогрессом */}
          <div className="shrink-0 border-b-2 border-ink px-4 py-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-mono text-[12px] uppercase tracking-[0.08em] text-ink-muted">
                Шаг {step + 1} из {STEP_TITLES.length}
              </p>
              <button
                type="button"
                onClick={close}
                aria-label="Закрыть"
                className="rounded-lg p-1 text-ink transition-colors hover:bg-ink/10"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mb-2 flex gap-1" aria-hidden="true">
              {STEP_TITLES.map((t, i) => (
                <span
                  key={t}
                  className={[
                    'h-1.5 flex-1 rounded-full transition-colors',
                    i <= step ? 'bg-ink' : 'bg-ink/20',
                  ].join(' ')}
                />
              ))}
            </div>
            <h2 className="font-poster text-[20px] font-semibold uppercase tracking-[0.03em] text-ink">
              {STEP_TITLES[step]}
            </h2>
          </div>

          {/* Тело шага */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {step === 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {BED_TEMPLATES.map((t) => (
                  <ChoiceCard
                    key={t.id}
                    icon={t.icon}
                    label={t.name}
                    active={criteria.templateId === t.id}
                    onClick={() =>
                      pick({
                        templateId: t.id,
                        // Условия шаблона — разумные значения по умолчанию,
                        // пользователь их подтверждает или меняет на след. шагах.
                        sunExposure: t.sunExposure,
                        soilType: t.soilType,
                        moisture: t.moisture,
                      })
                    }
                  />
                ))}
                <ChoiceCard
                  icon="✨"
                  label="Без шаблона"
                  active={criteria.templateId === undefined}
                  onClick={() => pick({ templateId: undefined })}
                />
              </div>
            )}

            {step === 1 && (
              <div className="grid grid-cols-3 gap-2">
                {SUN_EXPOSURES.map((s) => (
                  <ChoiceCard
                    key={s.value}
                    icon={s.icon}
                    label={s.label}
                    active={criteria.sunExposure === s.value}
                    onClick={() => pick({ sunExposure: s.value as SunExposure })}
                  />
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {SOIL_TYPES.map((s) => (
                  <ChoiceCard
                    key={s.value}
                    icon={s.icon}
                    label={s.label}
                    active={criteria.soilType === s.value}
                    onClick={() => pick({ soilType: s.value as SoilType })}
                  />
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-4">
                <div>
                  <p className="mb-2 font-mono text-[13px] text-ink-muted">Влага</p>
                  <div className="grid grid-cols-3 gap-2">
                    {MOISTURE_NEEDS.map((m) => (
                      <ChoiceCard
                        key={m.value}
                        icon={m.icon}
                        label={m.label}
                        active={criteria.moisture === m.value}
                        onClick={() => patch({ moisture: m.value as MoistureNeed })}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 font-mono text-[13px] text-ink-muted">Высота</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {HEIGHT_BANDS.map((h) => (
                      <ChoiceCard
                        key={h.value}
                        icon={h.icon}
                        label={h.label}
                        active={criteria.height === h.value}
                        onClick={() => patch({ height: h.value as HeightBand })}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {COLOR_FAMILIES.map((c) => (
                  <ChoiceCard
                    key={c.value}
                    icon={c.icon}
                    label={c.label}
                    active={criteria.color === c.value}
                    onClick={() => pick({ color: c.value as ColorFamily })}
                  />
                ))}
              </div>
            )}

            {step === 5 && (
              <div className="flex flex-col gap-2">
                {results.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="mb-3 text-4xl">🤔</div>
                    <p className="font-poster text-[17px] font-semibold uppercase text-ink-muted">
                      Условия противоречат друг другу
                    </p>
                    <p className="mt-1 text-[15px] text-ink-muted">
                      Вернитесь назад и смягчите требования — например, выберите «Любая» гамма
                    </p>
                  </div>
                ) : (
                  results.map(({ plant, reasons }) => (
                    <button
                      key={plant.catalogId}
                      type="button"
                      onClick={() => onPick?.(plant)}
                      disabled={!onPick}
                      className={[
                        'flex flex-col gap-1 rounded-[8px] border-2 border-ink bg-surface p-3 text-left shadow-blank',
                        onPick ? 'transition-colors hover:bg-ink/5' : 'cursor-default',
                      ].join(' ')}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-3 w-3 shrink-0 rounded-full border border-ink"
                          style={{ backgroundColor: plant.primaryColor }}
                        />
                        <span className="text-[16px] font-medium text-ink">{plant.name}</span>
                        <span className="ml-auto shrink-0 font-mono text-[12px] text-ink-muted">
                          {plant.heightCm} см
                        </span>
                      </span>
                      <span className="font-mono text-[12px] italic text-ink-muted">
                        {plant.latinName}
                      </span>
                      <span className="font-mono text-[12px] text-blueink">
                        {plant.bloomMonths.length > 0
                          ? `Цветёт: ${plant.bloomMonths.map(monthLabel).join(', ')}`
                          : 'Декоративна круглый год'}
                      </span>
                      {reasons.length > 0 && (
                        <span className="text-[13px] text-ink-muted">
                          {reasons.join(' · ')}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Навигация */}
          <div className="flex shrink-0 gap-2 border-t-2 border-ink px-4 py-3">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="h-[44px] flex-1 rounded-lg border-2 border-ink bg-paper px-4 font-poster text-[14px] font-semibold uppercase text-ink"
              >
                Назад
              </button>
            )}
            <button
              type="button"
              onClick={() => (step === 5 ? close() : setStep((s) => s + 1))}
              className="h-[44px] flex-1 rounded-lg border-2 border-ink bg-ink px-4 font-poster text-[14px] font-semibold uppercase text-paper transition-all duration-75 active:translate-y-[1px]"
            >
              {step === 5 ? 'Готово' : step === 4 ? 'Показать растения' : 'Дальше'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
