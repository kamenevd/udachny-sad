/**
 * Задача F.4 — индикатор синхронизации офлайн-очереди.
 *
 * Когда в очереди (F.1) есть отложенные мутации — «⟳ Синхронизируется…»,
 * когда очередь пуста — «✓ Всё сохранено». В офлайне явно сообщаем, что
 * записи ждут связи. Число берётся реактивно из usePendingSyncCount.
 *
 * `variant="badge"` — компактный вид для хедера; по умолчанию — строка.
 */
import { useOnlineStatus, usePendingSyncCount } from "../hooks/useOnlineStatus";

interface SyncIndicatorProps {
  variant?: "row" | "badge";
  className?: string;
}

export function SyncIndicator({ variant = "row", className = "" }: SyncIndicatorProps) {
  const online = useOnlineStatus();
  const pending = usePendingSyncCount();

  let icon: string;
  let text: string;
  let tone: string;

  if (pending > 0) {
    icon = online ? "⟳" : "…";
    text = online
      ? `Синхронизируется…${pending > 1 ? ` (${pending})` : ""}`
      : `Ждёт связи: ${pending}`;
    tone = "text-blueink";
  } else {
    icon = "✓";
    text = "Всё сохранено";
    tone = "text-ink-muted";
  }

  const spinning = pending > 0 && online ? "animate-spin" : "";
  const compact = variant === "badge";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={text}
      className={`inline-flex items-center gap-1.5 font-mono ${
        compact ? "text-[12px]" : "text-[13px]"
      } ${tone} ${className}`}
    >
      <span aria-hidden="true" className={`inline-block ${spinning}`}>
        {icon}
      </span>
      {!compact && <span>{text}</span>}
    </div>
  );
}
