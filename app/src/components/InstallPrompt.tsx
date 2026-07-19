/**
 * InstallPrompt — компонент «Установить приложение» для PWA (задача 12.2).
 *
 * Перехватывает beforeinstallprompt event, показывает баннер
 * с кнопкой установки. Скрывается если приложение уже установлено
 * (display-mode: standalone) или пользователь отклонил.
 *
 * DESIGN.md v5.1 — бумажный стиль, нижний sticky-баннер.
 *
 * Использование:
 *   <InstallPrompt />  // где угодно в приложении
 */

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('pwa-install-dismissed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Уже установлено? — не показываем
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async (): Promise<void> => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'dismissed') {
      try {
        localStorage.setItem('pwa-install-dismissed', 'true');
      } catch {
        // ignore
      }
      setDismissed(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = (): void => {
    try {
      localStorage.setItem('pwa-install-dismissed', 'true');
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[90] border-t-2 border-ink bg-surface p-4 shadow-blank"
      role="dialog"
      aria-label="Установить приложение"
    >
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <span className="text-[28px]">📲</span>
        <div className="flex-1">
          <p className="font-poster text-[15px] font-semibold uppercase tracking-[0.03em] text-ink">
            Установить на телефон
          </p>
          <p className="text-[13px] text-ink-muted">
            Работает как приложение, без браузера
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="rounded-lg p-2 text-ink-muted transition-colors hover:bg-ink/10"
          aria-label="Не сейчас"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => void handleInstall()}
          className="h-[44px] rounded-lg border-2 border-red bg-red px-5 font-poster text-[14px] font-semibold uppercase tracking-[0.04em] text-white outline-1 outline-white outline-offset-[-4px] shadow-blank transition-all duration-75 active:translate-y-[1px]"
        >
          Установить
        </button>
      </div>
    </div>
  );
}
