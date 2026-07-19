/**
 * Задача G.1 — общий хедер + переключатель режима «Солнечная вспышка».
 *
 * `HighContrastToggle` — иконка-кнопка (☀/🌗), включающая высококонтрастную
 * тему (useHighContrast). Встраивается в панель действий экранов (например,
 * в хедер «Мои участки»). `Header` — переиспользуемая обёртка-шапка для
 * экранов, которые захотят перейти на общий макет.
 */
import type { ReactNode } from "react";
import { useHighContrast } from "../hooks/useHighContrast";

export function HighContrastToggle({ className = "" }: { className?: string }) {
  const [enabled, toggle] = useHighContrast();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      className={`rounded-lg p-2 text-ink-muted transition-colors hover:bg-ink/10 ${className}`}
      aria-label={
        enabled ? "Выключить режим «Солнечная вспышка»" : "Включить режим «Солнечная вспышка» (высокий контраст)"
      }
      title={enabled ? "Обычный режим" : "Режим «Солнечная вспышка»"}
    >
      <span aria-hidden="true" className="text-[20px] leading-none">
        {enabled ? "🌗" : "☀️"}
      </span>
    </button>
  );
}

interface HeaderProps {
  title: string;
  onBack?: () => void;
  actions?: ReactNode;
}

export function Header({ title, onBack, actions }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-ink bg-paper px-4 py-4">
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-ink/10"
            aria-label="Назад"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <h1
          className="font-poster text-[30px] uppercase tracking-[0.03em] text-ink"
          style={{ fontWeight: 700 }}
        >
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-1">
        {actions}
        <HighContrastToggle />
      </div>
    </header>
  );
}
