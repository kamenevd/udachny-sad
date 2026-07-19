/**
 * Кнопки с двойной рамкой (DESIGN.md v5.1 §6)
 */


/**
 * Haptic feedback — лёгкая вибрация на поддерживаемых устройствах (задача 16.2).
 * Feature-detect: если navigator.vibrate недоступен — no-op.
 */
function hapticTap(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(50); } catch { /* ignore */ }
  }
}

import { memo } from 'react';
import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'plain' | 'disabled';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: React.ReactNode;
}

function ButtonInner({ variant = 'primary', children, className = '', onClick, ...props }: ButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    hapticTap();
    onClick?.(e);
  };

  // Задача G.3 — высота 56px и min-width 48px гарантируют WCAG touch-target 48×48.
  const baseStyles =
    'h-[56px] min-w-[48px] px-6 rounded-lg font-poster font-semibold uppercase tracking-[0.04em] cursor-pointer border-2 border-ink outline-1 outline-ink outline-offset-[-6px] shadow-blank transition-all duration-75 active:translate-y-[2px] active:shadow-[1px_1px_0_rgba(32,42,56,.25)] focus-visible:outline-3 focus-visible:outline-red focus-visible:outline-offset-2';

  const variantStyles: Record<ButtonVariant, string> = {
    primary: 'bg-red border-red outline-white text-white hover:bg-red-press',
    secondary: 'bg-paper text-ink',
    danger: 'bg-paper border-red outline-red text-red',
    plain: 'bg-transparent border-0 outline-0 shadow-none text-blueink underline decoration-blueink underline-offset-2',
    disabled: 'bg-[#EAE2CC] text-ink-muted border-ink outline-ink shadow-none cursor-not-allowed',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}

export const Button = memo(ButtonInner);
