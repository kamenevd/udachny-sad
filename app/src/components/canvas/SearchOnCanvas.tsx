/**
 * SearchOnCanvas — поиск объектов участка по названию/типу с подсветкой на канве
 * (задача 34.4).
 *
 * Разворачивается из кнопки-лупы в плавающую строку поиска над канвой. По вводу
 * фильтрует пункты экспликации (name + русское имя типа) и показывает список
 * совпадений. Тап по совпадению переиспользует существующий механизм подсветки
 * GardenDetail — выставляет selectedNumber, и объект(ы) группы подсвечиваются на
 * канве (isObjectSelected). Совпадения по тексту дополнительно подсвечиваются в
 * списке.
 */

import { useMemo, useState } from 'react';
import type { ExplicationItem } from '../Explication';
import { typeToRussian } from './useExplicationData';

/** Русские имена всех типов — чтобы искать «дерево», а не только по label. */
const TYPE_KEYWORDS = [
  'building',
  'lawn',
  'path',
  'flowerbed',
  'composition',
  'hedge',
  'tree',
  'shrub',
  'water',
  'gate',
  'other',
].map((t) => typeToRussian(t).toLowerCase());

interface SearchOnCanvasProps {
  /** Пункты экспликации (номер + имя) — источник для поиска. */
  items: ExplicationItem[];
  /** Текущий подсвеченный номер (для отметки активного результата). */
  selectedNumber: number | null;
  /** Подсветить группу по номеру (или снять подсветку — null). */
  onHighlight: (number: number | null) => void;
  className?: string;
}

export function SearchOnCanvas({
  items,
  selectedNumber,
  onHighlight,
  className,
}: SearchOnCanvasProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!q) return [];
    return items.filter((it) => {
      const name = it.name.toLowerCase();
      // Совпадение по имени пункта или по русскому названию типа, начинающемуся с запроса.
      return name.includes(q) || TYPE_KEYWORDS.some((t) => t.includes(q) && name.includes(t));
    });
  }, [items, q]);

  const close = () => {
    setOpen(false);
    setQuery('');
    onHighlight(null);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={items.length === 0}
        className={[
          'flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink bg-paper text-ink shadow-blank transition-colors hover:bg-ink/10 disabled:opacity-40',
          className ?? '',
        ].join(' ')}
        aria-label="Поиск объектов на схеме"
        title="Поиск объектов на схеме"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>
    );
  }

  return (
    <div className={['w-64 max-w-[80vw] rounded-[10px] border-2 border-ink bg-paper p-2 shadow-blank', className ?? ''].join(' ')}>
      <div className="flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-muted">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Грядка, яблоня, теплица…"
          aria-label="Поиск объектов на схеме"
          className="min-w-0 flex-1 bg-transparent font-mono text-[15px] text-ink outline-none placeholder:text-ink-muted"
        />
        <button
          type="button"
          onClick={close}
          aria-label="Закрыть поиск"
          className="shrink-0 rounded-lg p-1 text-ink transition-colors hover:bg-ink/10"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {q && (
        <div className="mt-2 max-h-[40vh] overflow-y-auto">
          {matches.length === 0 ? (
            <p className="px-1 py-2 font-mono text-[13px] text-ink-muted">Ничего не нашлось</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {matches.map((it) => (
                <li key={it.number}>
                  <button
                    type="button"
                    onClick={() => onHighlight(selectedNumber === it.number ? null : it.number)}
                    className={[
                      'flex w-full items-center gap-2 rounded-[6px] px-2 py-1.5 text-left transition-colors',
                      selectedNumber === it.number ? 'bg-ink text-paper' : 'text-ink hover:bg-ink/10',
                    ].join(' ')}
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current font-mono text-[12px]">
                      {it.number}
                    </span>
                    <span className="truncate text-[15px]">{it.name}</span>
                    {it.note && (
                      <span className="ml-auto shrink-0 font-mono text-[12px] opacity-70">{it.note}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default SearchOnCanvas;
