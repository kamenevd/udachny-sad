/**
 * Экспликация — DESIGN.md v5.1 §6 Экспликация + §3.4
 *
 * Выдвижная панель-бланк (bottom sheet) с таблицей-легендой
 * «№ · наименование · примечание».
 *
 * Сворачиваемая: по умолчанию показывается только ручка и заголовок,
 * по тапу раскрывается список строк.
 *
 * Касание строки подсвечивает объект (ring-2 ring-red) и вызывает onSelect(number).
 */

import { useState } from 'react';

export interface ExplicationItem {
  number: number;
  name: string;
  note?: string;
}

interface ExplicationProps {
  items: ExplicationItem[];
  onSelect?: (number: number) => void;
  className?: string;
}

export function Explication({ items, onSelect, className = '' }: ExplicationProps) {
  // collapsed = только ручка + заголовок; expanded = весь список
  const [collapsed, setCollapsed] = useState(true);
  const [activeNumber, setActiveNumber] = useState<number | null>(null);

  const handleRowClick = (number: number) => {
    setActiveNumber(number);
    onSelect?.(number);
  };

  const toggle = () => setCollapsed((c) => !c);

  return (
    <aside
      className={[
        // bottom-sheet бланк: surface фон, двойная рамка сверху, радиус 14 сверху, тень
        'bg-surface rounded-t-[14px] shadow-blank select-none',
        // Двойная рамка сверху: outer + inner контур
        'border-t-[3px] border-ink',
        'before:absolute before:top-[3px] before:left-0 before:right-0 before:h-[1.5px] before:bg-ink',
        'relative w-full overflow-hidden',
        className,
      ].join(' ')}
      role="region"
      aria-label="Экспликация"
    >
      {/* Шапка: ручка + заголовок + кнопка-переключатель */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={!collapsed}
        aria-controls="explication-list"
        className="relative flex w-full flex-col items-center gap-3 px-4 pt-3 pb-3 cursor-pointer"
      >
        {/* Ручка 40×5 ink (как у Modal/Sheet) */}
        <span
          aria-hidden
          className="h-[5px] w-10 rounded-full bg-ink"
        />
        {/* Заголовок: ЭКСПЛИКАЦИЯ — font-poster 14/600 uppercase ink + индикатор раскрытия */}
        <span className="flex w-full items-center justify-center gap-2">
          <span className="font-poster text-[14px] font-semibold uppercase tracking-[0.06em] text-ink">
            Экспликация
          </span>
          {/* Стрелка-индикатор состояния */}
          <svg
            aria-hidden
            width="12"
            height="12"
            viewBox="0 0 12 12"
            className={`text-ink-muted transition-transform duration-150 ${collapsed ? '' : 'rotate-180'}`}
          >
            <path
              d="M2 4l4 4 4-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {/* Список-таблица — раскрывается по тапу */}
      {!collapsed && (
        <ol
          id="explication-list"
          className="flex flex-col"
        >
          <li
            aria-hidden
            className="flex items-baseline gap-3 px-4 py-2 border-t border-ink/15"
          >
            {/* Шапка таблицы (визуальная) */}
            <span className="w-10 shrink-0 font-poster text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
              №
            </span>
            <span className="w-24 shrink-0 font-poster text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
              Наименование
            </span>
            <span className="flex-1 font-poster text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-muted">
              Примечание
            </span>
          </li>

          {items.map((item) => {
            const isActive = activeNumber === item.number;
            return (
              <li key={item.number}>
                <button
                  type="button"
                  onClick={() => handleRowClick(item.number)}
                  aria-pressed={isActive}
                  className={[
                    'group flex w-full items-baseline gap-3 px-4 py-2.5 text-left',
                    'border-t border-ink/15 transition-colors duration-75 cursor-pointer',
                    'focus:outline-none',
                    isActive
                      ? 'ring-2 ring-inset ring-red bg-red/5'
                      : 'hover:bg-paper/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red',
                  ].join(' ')}
                >
                  {/* № — font-mono (PT Mono), 11/700 */}
                  <span className="w-10 shrink-0 font-mono text-[11px] font-bold leading-tight text-blueink tabular-nums">
                    {String(item.number).padStart(2, '0')}
                  </span>

                  {/* Наименование — системный шрифт, 15px */}
                  <span className="w-24 shrink-0 text-[15px] leading-snug text-ink">
                    {item.name}
                  </span>

                  {/* Примечание — системный шрифт, 13px, ink-muted */}
                  <span className="flex-1 text-[13px] leading-snug text-ink-muted">
                    {item.note ?? '—'}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}

export default Explication;
