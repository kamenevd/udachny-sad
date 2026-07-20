/**
 * Реестр (списки) — DESIGN.md v5.1 §6
 *
 * Вертикальный список секций. Одна секция = один Registry
 * с заголовком раздела и пронумерованными строками-бланками.
 * Несколько Registry рядом образуют полный реестр.
 */

import { useState } from 'react';

export interface RegistryItem {
  number: number;
  title: string;
  meta?: string; // дата, статус и т.д.
  /** Короткая плашка перед метаданными, напр. «🌸 Цветёт» (PLAN12 задача 5) */
  badge?: string;
  /** Цветная метка слева от названия — основной цвет цветения (PLAN12 задача 5) */
  accentColor?: string;
}

interface RegistryProps {
  sectionTitle: string;
  items: RegistryItem[];
  onSelect?: (item: RegistryItem) => void;
  className?: string;
}

export function Registry({ sectionTitle, items, onSelect, className = '' }: RegistryProps) {
  const [activeNumber, setActiveNumber] = useState<number | null>(null);

  const handleClick = (item: RegistryItem) => {
    setActiveNumber(item.number);
    onSelect?.(item);
  };

  return (
    <section className={`flex flex-col ${className}`}>
      {/* Заголовок раздела: font-poster (Oswald) 14/600 uppercase ink */}
      <h2 className="font-poster text-[14px] font-semibold uppercase tracking-[0.04em] text-ink px-1 pb-3">
        {sectionTitle}
      </h2>

      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const isActive = activeNumber === item.number;
          return (
            <li key={item.number}>
              <button
                type="button"
                onClick={() => handleClick(item)}
                aria-pressed={isActive}
                className={`
                  group flex w-full h-[56px] items-center gap-3
                  rounded-lg border-[1.5px] bg-surface shadow-blank
                  transition-colors duration-75 cursor-pointer
                  text-left
                  ${isActive ? 'border-red' : 'border-ink hover:border-ink/70'}
                `}
              >
                {/* № строки: font-mono (PT Mono), blueink */}
                <span className="font-mono text-[14px] text-blueink pl-4 min-w-[2.5rem] text-left tabular-nums">
                  {String(item.number).padStart(2, '0')}
                </span>

                {/* Цвет цветения — кружок-образец */}
                {item.accentColor && (
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 shrink-0 rounded-full border border-ink"
                    style={{ backgroundColor: item.accentColor }}
                  />
                )}

                {/* Название — системный шрифт (§4: Oswald только для H1-H2/кнопок/вкладок/лозунгов) */}
                <span className="text-[15px] font-medium text-ink truncate flex-1">
                  {item.title}
                </span>

                {/* Плашка состояния (напр. цветение в выбранном месяце) */}
                {item.badge && (
                  <span className="shrink-0 rounded-[4px] border border-ink bg-paper px-1.5 py-0.5 font-mono text-[11px] text-ink">
                    {item.badge}
                  </span>
                )}

                {/* Метаданные (дата, статус) */}
                {item.meta && (
                  <span className="font-mono text-[12px] text-ink-muted pr-4 whitespace-nowrap">
                    {item.meta}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
