/**
 * useUndo — undo последнего действия через toast (задача 23.4).
 *
 * Показывает toast с кнопкой "Отменить" на 5 секунд.
 * При нажатии вызывает onUndo (re-create) с сохранёнными данными.
 *
 * Пример:
 *   const undo = useUndo();
 *   undo.showUndo("Участок списан", () => recreateGarden(data));
 */

import { useCallback, useRef } from 'react';
import { useToast } from '../components/Toast';

interface UndoEntry {
  message: string;
  undoFn: () => Promise<void> | void;
  timer: number;
}

export function useUndo() {
  const { showToast } = useToast();
  const entryRef = useRef<UndoEntry | null>(null);

  const clearEntry = useCallback(() => {
    if (entryRef.current) {
      window.clearTimeout(entryRef.current.timer);
      entryRef.current = null;
    }
  }, []);

  const showUndo = useCallback(
    (message: string, undoFn: () => Promise<void> | void, timeout = 5000) => {
      // Clear any previous undo entry
      clearEntry();

      const timer = window.setTimeout(() => {
        entryRef.current = null;
      }, timeout);

      entryRef.current = { message, undoFn, timer };

      // Show toast with undo hint
      showToast(`${message} · Отменить?`, 'info');
    },
    [showToast, clearEntry],
  );

  const executeUndo = useCallback(async () => {
    const entry = entryRef.current;
    if (!entry) return false;
    try {
      await entry.undoFn();
      clearEntry();
      showToast('Действие отменено', 'success');
      return true;
    } catch {
      showToast('Не получилось отменить', 'error');
      return false;
    }
  }, [showToast, clearEntry]);

  const canUndo = useCallback(() => entryRef.current !== null, []);

  return { showUndo, executeUndo, canUndo };
}
