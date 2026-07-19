/**
 * PlaceHistoryPrint — печатный (`window.print()`) layout архивной справки
 * места (задача 31.2). Хронологическая лента: от старых посадок к новым,
 * без интерактивных элементов — только текст, компактно для листа A4.
 *
 * Рендерится параллельно с экранной версией (`PlaceHistory.tsx`) и
 * переключается через Tailwind `print:` — видим только при печати.
 */

import { useEffect, useMemo, useState } from 'react';
import { getHistory } from '../lib/pbPlantings';
import type { PlantingWithPlant } from '../lib/pbPlantings';
import { formatRuDate } from '../components/PlantingForm';
import { plantTypeLabel } from './Plants';
import { plantingStatusLabel } from './PlantingDetail';

interface PlaceHistoryPrintProps {
  schemaObjectId: string;
  gardenName?: string;
}

export function PlaceHistoryPrint({ schemaObjectId, gardenName }: PlaceHistoryPrintProps) {
  const [history, setHistory] = useState<PlantingWithPlant[] | undefined>(undefined);
  useEffect(() => {
    void getHistory(schemaObjectId).then(setHistory);
  }, [schemaObjectId]);

  // Хронологический порядок для печати: от старых к новым (getHistory отдаёт по убыванию)
  const chronological = useMemo(() => (history ? [...history].reverse() : []), [history]);

  return (
    <div className="p-8 font-mono text-black">
      <h1 className="mb-1 font-poster text-[24px] font-semibold uppercase tracking-[0.03em]">
        Архивная справка
      </h1>
      {gardenName && <p className="mb-6 text-[14px] text-gray-600">{gardenName}</p>}

      {chronological.length === 0 ? (
        <p className="text-[14px] text-gray-600">Записей нет.</p>
      ) : (
        <ol className="flex flex-col gap-4 border-l-2 border-black pl-4">
          {chronological.map((p) => {
            const period = `${formatRuDate(new Date(p.plantedAt).getTime())}${
              p.endedAt ? ' — ' + formatRuDate(new Date(p.endedAt).getTime()) : ' — по настоящее время'
            }`;
            return (
              <li key={p.id} className="break-inside-avoid">
                <p className="font-mono text-[13px] text-gray-600">{period}</p>
                <p className="text-[16px] font-semibold">
                  {p.plant?.name ?? 'Без названия'}
                  {p.plant?.variety ? ` «${p.plant.variety}»` : ''}
                  {' — '}
                  {plantingStatusLabel(p.status)}
                </p>
                {p.plant && (
                  <p className="text-[13px] text-gray-600">
                    {plantTypeLabel(p.plant.plantType)}
                    {p.quantity ? ` × ${p.quantity}` : ''}
                  </p>
                )}
                {p.positionNote && <p className="text-[14px]">{p.positionNote}</p>}
                {p.notes && <p className="text-[14px] text-gray-700">{p.notes}</p>}
              </li>
            );
          })}
        </ol>
      )}

      <p className="mt-8 text-[12px] text-gray-400">
        уДачный сад — распечатано {formatRuDate(Date.now())}
      </p>
    </div>
  );
}

export default PlaceHistoryPrint;
