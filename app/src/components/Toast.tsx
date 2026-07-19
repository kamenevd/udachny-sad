/**
 * Toast — глобальная система уведомлений (задача 8.3).
 *
 * ToastProvider оборачивает приложение, предоставляя контекст.
 * useToast() возвращает функцию showToast(message, variant?).
 *
 * Варианты:
 *   - error   — красная рамка, для ошибок мутаций
 *   - success — зелёная рамка, для подтверждений
 *   - info    — синяя рамка
 *
 * Toast живёт 4 секунды, автоскрытие + кнопка закрытия.
 */

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type ToastVariant = "error" | "success" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, variant }]);
    // Автоскрытие через 4 секунды
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Контейнер тостов — фиксированный внизу экрана */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => (
          <ToastView key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const variantStyles: Record<ToastVariant, string> = {
    error: "border-red text-red",
    success: "border-green text-green",
    info: "border-blueink text-blueink",
  };

  const icons: Record<ToastVariant, string> = {
    error: "⚠️",
    success: "✅",
    info: "ℹ️",
  };

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[10px] border-2 bg-surface p-4 shadow-blank ${variantStyles[item.variant]}`}
    >
      <span className="text-[20px] leading-none" aria-hidden>{icons[item.variant]}</span>
      <p className="flex-1 text-[15px] leading-[1.45] text-ink font-mono">{item.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-ink-muted hover:text-ink transition-colors"
        aria-label="Закрыть уведомление"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast должен использоваться внутри <ToastProvider>");
  }
  return ctx;
}
