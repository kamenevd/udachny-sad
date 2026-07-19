/**
 * Задача G.1 — режим «Солнечная вспышка» (High Contrast Mode).
 *
 * На ярком дачном солнце экран телефона нечитаем. Этот режим включает тёмную
 * высококонтрастную тему (см. theme/highContrast.css) с крупными шрифтами и
 * кнопками. Выбор сохраняется в localStorage и применяется ДО гидратации
 * (initHighContrast() вызывается в main.tsx до createRoot), чтобы не было
 * вспышки светлой темы при загрузке.
 *
 * Флаг живёт как `data-hc="true"` на <html> — CSS цепляется за него.
 */
import { useCallback, useEffect, useState } from "react";

export const HIGH_CONTRAST_KEY = "udachny:high-contrast";

function read(): boolean {
  try {
    return localStorage.getItem(HIGH_CONTRAST_KEY) === "1";
  } catch {
    return false;
  }
}

/** Проставляет/снимает атрибут на <html>. */
export function applyHighContrast(enabled: boolean): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (enabled) root.setAttribute("data-hc", "true");
  else root.removeAttribute("data-hc");
}

/**
 * Применяет сохранённый выбор синхронно при старте — до первого рендера React.
 * Вызывать в main.tsx перед createRoot(...).render().
 */
export function initHighContrast(): void {
  applyHighContrast(read());
}

export function useHighContrast(): [boolean, () => void] {
  const [enabled, setEnabled] = useState<boolean>(read);

  // Синхронизируем DOM при монтировании (на случай, если init не вызывался).
  useEffect(() => {
    applyHighContrast(enabled);
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(HIGH_CONTRAST_KEY, next ? "1" : "0");
      } catch {
        /* приватный режим — просто применим на сессию */
      }
      applyHighContrast(next);
      return next;
    });
  }, []);

  return [enabled, toggle];
}
