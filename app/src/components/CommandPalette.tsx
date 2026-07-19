/**
 * Задача H.1 — командная палитра (Cmd+K) с поиском по канве.
 *
 * Открывается по Cmd/Ctrl+K или тапом по FAB (мобильные). Ищет объекты участка
 * по названию/сорту/типу (useCanvasSearch), при выборе результата вызывает
 * onSelect — GardenDetail плавно центрирует объект на канве (usePanZoom.focusOn)
 * и подсвечивает его. Клавиши ↑/↓ — навигация, Enter — выбор, Esc — закрыть.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  searchCanvasItems,
  type CanvasSearchItem,
  type CanvasSearchResult,
} from "../hooks/useCanvasSearch";

interface CommandPaletteProps {
  items: CanvasSearchItem[];
  onSelect: (item: CanvasSearchResult) => void;
}

export function CommandPalette({ items, onSelect }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => searchCanvasItems(items, query), [items, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  // Глобальный хоткей Cmd/Ctrl+K.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Фокус в поле при открытии.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const choose = useCallback(
    (item: CanvasSearchResult | undefined) => {
      if (!item) return;
      onSelect(item);
      close();
    },
    [onSelect, close],
  );

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  return (
    <>
      {/* FAB для мобильных — открыть палитру без клавиатуры */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Поиск по участку (Cmd+K)"
        title="Поиск по участку (Cmd+K)"
        className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full border-2 border-ink bg-paper text-ink shadow-blank transition-transform active:translate-y-[2px] md:hidden"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-start justify-center bg-ink/40 px-4 pt-[12vh]"
          onClick={close}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Командная палитра"
            className="w-full max-w-md rounded-[12px] border-2 border-ink bg-paper shadow-blank"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b-2 border-ink/20 px-3 py-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-muted">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="Грядка, томат «Бычье сердце», яблоня…"
                aria-label="Поиск по участку"
                className="min-w-0 flex-1 bg-transparent py-1 font-mono text-[16px] text-ink outline-none placeholder:text-ink-muted"
              />
              <kbd className="hidden shrink-0 rounded border border-ink/30 px-1.5 py-0.5 font-mono text-[11px] text-ink-muted sm:block">
                Esc
              </kbd>
            </div>

            {query.trim() !== "" && (
              <ul className="max-h-[50vh] overflow-y-auto p-1">
                {results.length === 0 ? (
                  <li className="px-3 py-3 font-mono text-[14px] text-ink-muted">
                    Ничего не нашлось
                  </li>
                ) : (
                  results.map((r, i) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onMouseEnter={() => setActive(i)}
                        onClick={() => choose(r)}
                        aria-selected={i === active}
                        className={[
                          "flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left transition-colors",
                          i === active ? "bg-ink text-paper" : "text-ink hover:bg-ink/10",
                        ].join(" ")}
                      >
                        {r.number != null && (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current font-mono text-[12px]">
                            {r.number}
                          </span>
                        )}
                        <span className="truncate text-[15px]">{r.label}</span>
                        <span className="ml-auto shrink-0 font-mono text-[12px] opacity-70">
                          {r.typeName}
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
