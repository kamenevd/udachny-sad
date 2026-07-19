/**
 * ErrorBoundary — глобальный перехватчик ошибок React (задача 8.1).
 *
 * Ловит рантайм-ошибки в дереве компонентов, показывает fallback
 * в стиле бумажного журнала: «Что-то не так. Но мы не сдаёмся.»
 * с кнопкой перезагрузки.
 *
 * Использование:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // В production сюда можно добавить отправку в Sentry/аналитику
    console.error('[ErrorBoundary] Поймана ошибка:', error, errorInfo);
  }

  handleReload = (): void => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-6"
        role="alert"
      >
        <div className="w-full max-w-sm text-center">
          {/* Иконка-эмблема */}
          <div className="mb-6 text-5xl">🌱</div>

          {/* Рамка в стиле бумажного журнала */}
          <div className="rounded-[10px] border-2 border-ink bg-surface p-[5px] shadow-blank">
            <div className="rounded-[6px] border border-ink p-6">
              <h1 className="mb-3 font-poster text-[24px] font-semibold uppercase tracking-[0.03em] text-ink">
                Что-то не так
              </h1>
              <p className="mb-4 text-[17px] leading-[1.5] text-ink">
                Но мы не сдаёмся! Ошибка записана. Попробуем ещё раз?
              </p>

              {/* Краткая информация об ошибке (только в dev) */}
              {import.meta.env.DEV && this.state.error && (
                <details className="mb-4 text-left">
                  <summary className="cursor-pointer font-mono text-[14px] text-blueink underline underline-offset-2">
                    Детали ошибки
                  </summary>
                  <pre className="mt-2 overflow-auto rounded-lg border border-ink/20 bg-paper p-2 font-mono text-[12px] text-ink-muted">
                    {this.state.error.message}
                    {'\n'}
                    {this.state.error.stack?.split('\n').slice(0, 5).join('\n')}
                  </pre>
                </details>
              )}

              <button
                type="button"
                onClick={this.handleReload}
                className="h-[56px] w-full rounded-lg border-2 border-red bg-red px-6 font-poster text-[15px] font-semibold uppercase tracking-[0.04em] text-white outline-1 outline-white outline-offset-[-6px] shadow-blank transition-all duration-75 active:translate-y-[2px] active:shadow-[1px_1px_0_rgba(32,42,56,.25)]"
              >
                🔄 Перезагрузить
              </button>
            </div>
          </div>

          <p className="mt-4 font-mono text-[13px] text-ink-muted">
            Если повторится — напишите, починим
          </p>
        </div>
      </div>
    );
  }
}
