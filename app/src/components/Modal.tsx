import { type ReactNode, useEffect, useRef, useCallback } from 'react';
import { Button } from './Button';

export interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  /** Текст кнопки подтверждения */
  confirmText?: string;
  /** Текст кнопки отмены */
  cancelText?: string;
  /** Вариант кнопки подтверждения */
  confirmVariant?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Селектор фокусируемых элементов (задача 19.2 — focus trap).
 */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Модальное окно — bottom-sheet (DESIGN.md v5.1 §6).
 * На мобильных выезжает снизу, на десктопе — центрированный диалог
 * с сохранением стиля sheet сверху.
 *
 * Задача 19.2: focus trap — при открытии фокус на первом элементе,
 * Tab зациклен внутри модала, восстановление фокуса при закрытии.
 */
export function Modal({
  open,
  title,
  children,
  confirmText = 'Да',
  cancelText = 'Отмена',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  // Элемент, у которого был фокус до открытия модала — restored при закрытии.
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Escape + body overflow lock
  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';

    // Установить фокус на первый фокусируемый элемент внутри модала
    const focusTimer = setTimeout(() => {
      const node = dialogRef.current;
      if (!node) return;
      const focusable = node.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable) {
        focusable.focus();
      } else {
        // Нет фокусируемых детей — фокус на сам контейнер
        node.setAttribute('tabindex', '-1');
        node.focus();
      }
    }, 0);

    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
      clearTimeout(focusTimer);
      // Восстановить фокус на элементе, который был до открытия
      previouslyFocused.current?.focus?.();
    };
  }, [open, onCancel]);

  // Focus trap: Tab / Shift+Tab не выходит за пределы модала
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Tab') return;
      const node = dialogRef.current;
      if (!node) return;
      const focusable = Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        // Shift+Tab на первом → перейти на последний
        if (active === first || !node.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab на последнем → перейти на первый
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [],
  );

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onKeyDown={handleKeyDown}
    >
      {/* Затемнённый фон */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
      />

      {/* Sheet: выезжает снизу, на десктопе центрирован */}
      <div
        className="relative w-full animate-[sheet-up_0.22s_ease-out] rounded-t-[14px] border-t-2 border-ink bg-surface sm:max-w-md sm:rounded-t-[14px]"
      >
        {/* Внутренняя рамка сверху (1px, отступ 4px от внешней) */}
        <div className="mt-1 border-t border-ink" />

        {/* Ручка */}
        <div className="flex justify-center pt-3">
          <div className="h-[5px] w-10 rounded-full bg-ink" />
        </div>

        {/* Контент */}
        <div className="px-6 pb-6 pt-3">
          <h2
            id="modal-title"
            className="mb-3 font-poster text-[21px] font-semibold uppercase text-ink"
          >
            {title}
          </h2>
          <div className="mb-6 text-[17px] leading-relaxed text-ink-muted">
            {children}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onCancel}>
              {cancelText}
            </Button>
            <Button variant={confirmVariant} onClick={onConfirm}>
              {confirmText}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
