/**
 * ExportReport — «Сохранить план в PDF» (PLAN13 этап 4).
 *
 * Вместо jspdf/html2canvas — нативная печать браузера: снимок Konva-канвы
 * (stage.toDataURL, как в ExportPng) + экспликация + список растений
 * рендерятся в печатный оверлей, дальше window.print() → «Сохранить как
 * PDF» на любом устройстве. Почему так:
 *  - у jsPDF нет кириллицы без вшивания TTF-шрифта (~1 МБ в бандле);
 *  - html2canvas не нужен — Konva отдаёт снимок сама и качественнее;
 *  - печать работает офлайн и не тянет зависимостей.
 *
 * Видимость при печати управляется классом .print-garden-report
 * (см. utils/printStyles.css — тот же приём, что у карточки растения).
 */

import { useState, type RefObject } from 'react';
import type Konva from 'konva';
import type { ExplicationItem } from '../Explication';
import type { PlantingWithPlant } from '../../lib/pbPlantings';
import { plantTypeLabel, MONTHS_RU } from '../../types/plant';

interface ExportReportProps {
  stageRef: RefObject<Konva.Stage | null>;
  gardenName: string;
  items: ExplicationItem[];
  plantings: PlantingWithPlant[];
  className?: string;
}

/** «июн–сен» из массива месяцев цветения */
export function bloomRangeLabel(months?: number[]): string {
  if (!Array.isArray(months) || months.length === 0) return '—';
  const valid = [...new Set(months.filter((m) => Number.isInteger(m) && m >= 1 && m <= 12))]
    .sort((a, b) => a - b);
  if (valid.length === 0) return '—';
  const short = (m: number) => MONTHS_RU[m - 1].slice(0, 3).toLowerCase();
  return valid.length === 1
    ? short(valid[0])
    : `${short(valid[0])}–${short(valid[valid.length - 1])}`;
}

const SUN_LABELS: Record<string, string> = {
  full_sun: 'солнце',
  partial_shade: 'полутень',
  full_shade: 'тень',
};

const MOISTURE_LABELS: Record<string, string> = {
  low: 'засухостойкое',
  medium: 'умеренный полив',
  high: 'влаголюбивое',
};

export function ExportReport({ stageRef, gardenName, items, plantings, className }: ExportReportProps) {
  const [snapshot, setSnapshot] = useState<string | null>(null);

  const openReport = () => {
    const stage = stageRef.current;
    if (!stage) return;
    setSnapshot(stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' }));
  };

  const today = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long' }).format(new Date());

  return (
    <>
      <button
        type="button"
        onClick={openReport}
        aria-label="Сохранить план в PDF"
        title="Сохранить план в PDF"
        className={className ?? 'shrink-0 cursor-pointer'}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M9 15h6M9 11h2" />
        </svg>
      </button>

      {snapshot && (
        <div
          className="print-garden-report fixed inset-0 z-[70] overflow-y-auto bg-paper"
          role="dialog"
          aria-modal="true"
          aria-label="Отчёт по саду для печати"
        >
          <div className="mx-auto max-w-3xl p-6">
            {/* Кнопки — на экране, скрыты при печати */}
            <div className="print-hidden mb-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="h-[44px] rounded-lg border-2 border-ink bg-ink px-4 font-poster text-[14px] font-semibold uppercase text-paper"
              >
                🖨 Распечатать / сохранить PDF
              </button>
              <button
                type="button"
                onClick={() => setSnapshot(null)}
                className="h-[44px] rounded-lg border-2 border-ink bg-paper px-4 font-poster text-[14px] font-semibold uppercase text-ink"
              >
                Закрыть
              </button>
            </div>

            {/* Шапка отчёта */}
            <div className="mb-4 border-b-2 border-ink pb-3">
              <h1 className="font-poster text-[26px] font-bold uppercase tracking-[0.03em] text-ink">
                {gardenName}
              </h1>
              <p className="font-mono text-[13px] text-ink-muted">
                План сада · {today} · уДачный сад
              </p>
            </div>

            {/* Снимок канвы */}
            <img
              src={snapshot}
              alt={`Схема участка «${gardenName}»`}
              className="mb-6 w-full rounded-[8px] border-2 border-ink bg-surface"
            />

            {/* Экспликация */}
            {items.length > 0 && (
              <section className="mb-6">
                <h2 className="mb-2 font-poster text-[16px] font-semibold uppercase text-ink">
                  Экспликация
                </h2>
                <table className="w-full border-collapse text-[14px]">
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.number} className="border-b border-ink/30">
                        <td className="w-10 py-1 pr-2 font-mono text-[13px] text-blueink">
                          {String(item.number).padStart(2, '0')}
                        </td>
                        <td className="py-1 text-ink">{item.name}</td>
                        <td className="py-1 pl-2 font-mono text-[12px] text-ink-muted">
                          {item.note ?? ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/* Растения */}
            <section>
              <h2 className="mb-2 font-poster text-[16px] font-semibold uppercase text-ink">
                Растения ({plantings.length})
              </h2>
              {plantings.length === 0 ? (
                <p className="font-mono text-[14px] text-ink-muted">
                  Активных посадок пока нет
                </p>
              ) : (
                <table className="w-full border-collapse text-[14px]">
                  <thead>
                    <tr className="border-b-2 border-ink text-left font-mono text-[12px] uppercase text-ink-muted">
                      <th className="py-1 pr-2">Растение</th>
                      <th className="py-1 pr-2">Тип</th>
                      <th className="py-1 pr-2">Цветение</th>
                      <th className="py-1">Условия</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plantings.map((p) => {
                      const traits = [
                        p.plant?.sun_exposure ? SUN_LABELS[p.plant.sun_exposure] : null,
                        p.plant?.moisture ? MOISTURE_LABELS[p.plant.moisture] : null,
                        p.plant?.height_cm ? `до ${p.plant.height_cm} см` : null,
                      ].filter(Boolean).join(', ');
                      return (
                        <tr key={p.id} className="border-b border-ink/30 align-top">
                          <td className="py-1 pr-2 text-ink">
                            {p.plant?.name ?? 'Растение'}
                            {p.plant?.variety ? ` «${p.plant.variety}»` : ''}
                            {p.quantity ? ` × ${p.quantity}` : ''}
                          </td>
                          <td className="py-1 pr-2 text-ink-muted">
                            {p.plant ? plantTypeLabel(p.plant.plantType) : '—'}
                          </td>
                          <td className="py-1 pr-2 font-mono text-[13px] text-ink">
                            {bloomRangeLabel(p.plant?.bloom_months)}
                          </td>
                          <td className="py-1 text-[13px] text-ink-muted">{traits || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
