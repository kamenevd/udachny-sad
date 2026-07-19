/**
 * useDrawZone — рисование зон условий (задача 3.7).
 * Зона — всегда полигон; переиспользует механику тапов/замыкания
 * из useDrawObject, отдаёт готовые точки в onCommit (zones.create).
 */

import { useDrawObject } from './useDrawObject';
import type { UseDrawObjectResult } from './useDrawObject';

export interface UseDrawZoneOptions {
  /** Рисование активно (режим зон + выбран слой и condition) */
  active: boolean;
  /** Позиция на Stage (stage.getRelativePointerPosition) → метры */
  toMeters: (stagePoint: { x: number; y: number }) => { x: number; y: number };
  /** Порог замыкания полигона в метрах */
  closeThresholdM?: number;
  /** Сохранение зоны (zones.create); точки в метрах */
  onCommit: (points: number[][]) => Promise<void> | void;
}

export function useDrawZone(options: UseDrawZoneOptions): UseDrawObjectResult {
  return useDrawObject({
    active: options.active,
    kind: 'polygon',
    toMeters: options.toMeters,
    closeThresholdM: options.closeThresholdM,
    onCommit: (geometry) => options.onCommit(geometry.points),
  });
}
