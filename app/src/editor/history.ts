/**
 * История правок редактора: снимки документа, undo/redo (EDITOR.md).
 *
 * Каждое ЗАКОНЧЕННОЕ действие (постановка, конец переноса/растяжения,
 * удаление, правка поля) фиксирует новый снимок. Промежуточные состояния
 * жестов в историю не попадают — их держит канва до конца жеста.
 */

import type { EditorDoc, EditorItem } from './model';

export interface History {
  present: EditorDoc;
  past: EditorDoc[];
  future: EditorDoc[];
}

/** Максимум шагов истории — хватает на сессию, память ограничена. */
const MAX_PAST = 50;

export function initHistory(doc: EditorDoc): History {
  return { present: doc, past: [], future: [] };
}

/** Зафиксировать новое состояние (сбрасывает redo-ветку). */
export function commit(h: History, next: EditorDoc): History {
  if (next === h.present) return h;
  const past = [...h.past, h.present];
  if (past.length > MAX_PAST) past.shift();
  return { present: next, past, future: [] };
}

export function canUndo(h: History): boolean {
  return h.past.length > 0;
}

export function canRedo(h: History): boolean {
  return h.future.length > 0;
}

export function undo(h: History): History {
  if (h.past.length === 0) return h;
  const previous = h.past[h.past.length - 1];
  return {
    present: previous,
    past: h.past.slice(0, -1),
    future: [h.present, ...h.future],
  };
}

export function redo(h: History): History {
  if (h.future.length === 0) return h;
  const [next, ...rest] = h.future;
  return {
    present: next,
    past: [...h.past, h.present],
    future: rest,
  };
}

// ─── Правки документа (все возвращают новый документ) ──────────────────

export function addItem(doc: EditorDoc, item: EditorItem): EditorDoc {
  return item.kind === 'object'
    ? { ...doc, objects: [...doc.objects, item] }
    : { ...doc, zones: [...doc.zones, item] };
}

export function updateItem(doc: EditorDoc, id: string, patch: Partial<EditorItem>): EditorDoc {
  const objects = doc.objects.map((o) =>
    o.id === id ? ({ ...o, ...patch } as typeof o) : o,
  );
  const zones = doc.zones.map((z) =>
    z.id === id ? ({ ...z, ...patch } as typeof z) : z,
  );
  return { objects, zones };
}

export function removeItem(doc: EditorDoc, id: string): EditorDoc {
  return {
    objects: doc.objects.filter((o) => o.id !== id),
    zones: doc.zones.filter((z) => z.id !== id),
  };
}

/**
 * Замена временного id на постоянный (после создания записи в PB) —
 * во всех снимках истории, чтобы undo/redo ссылались на живую запись.
 */
export function remapId(h: History, tempId: string, realId: string): History {
  const remapDoc = (doc: EditorDoc): EditorDoc => ({
    objects: doc.objects.map((o) => (o.id === tempId ? { ...o, id: realId } : o)),
    zones: doc.zones.map((z) => (z.id === tempId ? { ...z, id: realId } : z)),
  });
  return {
    present: remapDoc(h.present),
    past: h.past.map(remapDoc),
    future: h.future.map(remapDoc),
  };
}
