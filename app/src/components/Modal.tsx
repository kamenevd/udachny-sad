import { type ReactNode, useEffect } from 'react';
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
 * Модальное окно — bottom-sheet (DESIGN.md v5.1 §6).
 * На мобильных выезжает снизу, на десктопе — центрированный диалог
 * с сохранением стиля sheet сверху.
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
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
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
