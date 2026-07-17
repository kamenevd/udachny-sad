import { type InputHTMLAttributes, forwardRef, useId } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * Текстовый инпут в стиле v5.1 «Садовая книжка»
 * DESIGN.md §6: поверхность surface, рамка ink, ввод PT Mono (blueink)
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-[13px] font-poster font-semibold uppercase tracking-[0.05em] text-ink-muted"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full h-[52px] rounded-lg border-2 border-ink bg-surface px-[14px] text-base font-mono text-blueink',
            'placeholder:text-ink-muted transition-all',
            error
              ? 'border-red focus:border-red focus:outline-none focus:shadow-[3px_3px_0_rgba(191,46,36,.3)]'
              : 'focus:border-red focus:outline-none focus:shadow-blank',
            className,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-invalid={error ? true : undefined}
          {...props}
        />
        {error && <p className="mt-1 text-sm font-mono text-red">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';