/**
 * PLAN12 задача 11 — панель советов по ландшафту.
 *
 * Дровер на канвасе: кнопка «💡 Советы» со счётчиком предупреждений,
 * внутри — карточки рекомендаций от useLandscapeAdvisor. У совета, привязанного
 * к объекту схемы, есть действие «Показать на схеме» — оно выделяет объект и
 * центрирует на нём канвас (тот же focusOn, что у командной палитры).
 *
 * Оформление повторяет AiCareTip из PlantingDetail: двойная рамка-бланк,
 * заголовок font-poster uppercase, тело — обычный текст.
 */

import { useState } from 'react';
import type { AdviceKind, LandscapeAdvice } from '../hooks/useLandscapeAdvisor';

const KIND_ICON: Record<AdviceKind, string> = {
  empty_zone: '🕳️',
  incompatible: '⚠️',
  light_mismatch: '☀️',
  color: '🎨',
  season_gap: '📅',
};

interface AiLandscapeTipsProps {
  advice: LandscapeAdvice[];
  /** Показать объект на схеме — выделить и центрировать */
  onShowObject?: (objectId: string) => void;
  /** Открыть мастер подбора — действие для пустых зон */
  onOpenWizard?: () => void;
  className?: string;
}

export function AiLandscapeTips({
  advice, onShowObject, onOpenWizard, className = '',
}: AiLandscapeTipsProps) {
  const [open, setOpen] = useState(false);
  const warnings = advice.filter((a) => a.severity === 'warning').length;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-tour="advisor-button"
        className={[
          'flex min-h-[44px] items-center gap-1.5 rounded-[8px] border-2 border-ink px-3',
          'font-poster text-[14px] font-semibold uppercase shadow-blank transition-colors',
          open ? 'bg-ink text-paper' : 'bg-paper text-ink hover:bg-ink/10',
        ].join(' ')}
      >
        <span aria-hidden="true">💡</span>
        Советы
        {advice.length > 0 && (
          <span
            className={[
              'ml-0.5 rounded-full px-1.5 font-mono text-[12px]',
              warnings > 0
                ? 'bg-red text-paper'
                : open
                  ? 'bg-paper/20 text-paper'
                  : 'bg-ink/10 text-ink-muted',
            ].join(' ')}
          >
            {advice.length}
          </span>
        )}
      </button>

      {open && (
        <div className="mt-2 w-[min(92vw,420px)] rounded-[10px] border-2 border-ink bg-paper p-[5px] shadow-blank">
          <div className="max-h-[52dvh] overflow-y-auto rounded-[6px] border border-ink p-3">
            <p className="mb-3 font-poster text-[13px] uppercase tracking-[0.05em] text-ink-muted">
              🤖 Советник по ландшафту
            </p>

            {advice.length === 0 ? (
              <div className="py-6 text-center">
                <div className="mb-2 text-3xl">✅</div>
                <p className="text-[15px] leading-[1.5] text-ink">
                  Замечаний нет. Нарисуйте клумбы и добавьте посадки — советник
                  подскажет, что улучшить.
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {advice.map((item) => (
                  <li
                    key={item.id}
                    className={[
                      'rounded-[8px] border-2 bg-surface p-3',
                      item.severity === 'warning' ? 'border-red' : 'border-ink',
                    ].join(' ')}
                  >
                    <p className="mb-1 flex items-start gap-2 font-poster text-[15px] font-semibold uppercase leading-tight text-ink">
                      <span aria-hidden="true">{KIND_ICON[item.kind]}</span>
                      <span>{item.title}</span>
                    </p>
                    <p className="text-[14px] leading-[1.5] text-ink">{item.text}</p>

                    <div className="mt-2 flex gap-3">
                      {item.objectId && onShowObject && (
                        <button
                          type="button"
                          onClick={() => onShowObject(item.objectId as string)}
                          className="font-mono text-[13px] text-blueink underline underline-offset-2"
                        >
                          Показать на схеме
                        </button>
                      )}
                      {item.kind === 'empty_zone' && onOpenWizard && (
                        <button
                          type="button"
                          onClick={onOpenWizard}
                          className="font-mono text-[13px] text-blueink underline underline-offset-2"
                        >
                          Подобрать растения
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
