/**
 * Задача H.1 — поиск объектов участка для командной палитры (Cmd+K).
 *
 * Индексирует объекты канвы по названию, русскому имени типа и сорту, ранжирует
 * совпадения и отдаёт лучшие. Отдельно — чистая математика центрирования
 * (`computeFocusTransform`): куда сдвинуть/масштабировать Stage, чтобы объект
 * оказался в центре вьюпорта (использует usePanZoom.focusOn при выборе).
 */
import { useCallback } from "react";

export interface CanvasSearchItem {
  id: string;
  /** Название объекта (label/имя посадки). */
  label: string;
  /** Русское имя типа («Грядка», «Яблоня»). */
  typeName: string;
  /** Сорт/примечание (если есть). */
  variety?: string;
  /** Номер в экспликации (для подсветки группы). */
  number?: number;
  /** Центр объекта в координатах модели канвы. */
  centroid: { x: number; y: number };
}

export interface CanvasSearchResult extends CanvasSearchItem {
  score: number;
}

/** Ранг совпадения: точное начало важнее вхождения, имя важнее типа/сорта. */
function scoreItem(item: CanvasSearchItem, q: string): number {
  const label = item.label.toLowerCase();
  const type = item.typeName.toLowerCase();
  const variety = item.variety?.toLowerCase() ?? "";

  if (label === q) return 100;
  if (label.startsWith(q)) return 80;
  if (label.includes(q)) return 60;
  if (variety.startsWith(q)) return 50;
  if (variety.includes(q)) return 40;
  if (type.startsWith(q)) return 30;
  if (type.includes(q)) return 20;
  return 0;
}

/** Отфильтровать и отсортировать объекты по запросу. */
export function searchCanvasItems(
  items: CanvasSearchItem[],
  query: string,
  limit = 20,
): CanvasSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return items
    .map((item) => ({ ...item, score: scoreItem(item, q) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, limit);
}

export interface Viewport {
  width: number;
  height: number;
}
export interface StageTransform {
  x: number;
  y: number;
  scale: number;
}

/**
 * Трансформация Stage, при которой точка модели `point` оказывается в центре
 * вьюпорта при масштабе `scale`. Экранная позиция точки:
 *   screen = position + point * scale  ⇒  position = viewport/2 − point*scale.
 */
export function computeFocusTransform(
  point: { x: number; y: number },
  viewport: Viewport,
  scale: number,
): StageTransform {
  return {
    scale,
    x: viewport.width / 2 - point.x * scale,
    y: viewport.height / 2 - point.y * scale,
  };
}

/** Хук: замемоизированная функция поиска по фиксированному набору объектов. */
export function useCanvasSearch(items: CanvasSearchItem[]) {
  return useCallback(
    (query: string) => searchCanvasItems(items, query),
    [items],
  );
}

/** Центроид набора точек [[x,y],…] в координатах модели. */
export function centroidOf(points: number[][]): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 };
  let sx = 0;
  let sy = 0;
  for (const [x, y] of points) {
    sx += x;
    sy += y;
  }
  return { x: sx / points.length, y: sy / points.length };
}
