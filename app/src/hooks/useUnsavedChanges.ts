/**
 * useUnsavedChanges — задача 16.3.
 * Пока `active` истинно, предупреждает при закрытии/обновлении вкладки
 * (событие beforeunload), чтобы не потерять несохранённые изменения формы.
 */

import { useEffect } from 'react';

export function useUnsavedChanges(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [active]);
}
