/**
 * useDrawObject — рисование объектов схемы тапами (задача 3.3).
 * point: один тап; line: тапы + «Готово»; polygon: тапы, замыкание
 * тапом у первой точки или кнопкой «Готово».
 */
import { useState, useEffect, useCallback } from 'react';
import type Konva from 'konva';

export type DrawGeometryKind = 'point' | 'line' | 'polygon';

export interface DrawGeometry {
  type: DrawGeometryKind;
  points: number[][];
}

export interface UseDrawObjectOptions {
  active: boolean;
  kind: DrawGeometryKind;
  toMeters: (stagePoint: { x: number; y: number }) => { x: number; y: number };
  closeThresholdM?: number;
  onCommit: (geometry: DrawGeometry) => Promise<void> | void;
}

export interface UseDrawObjectResult {
  draftPoints: number[][];
  handleStageTap: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  finish: () => void;
  cancel: () => void;
  canFinish: boolean;
  saving: boolean;
}

export function useDrawObject(options: UseDrawObjectOptions): UseDrawObjectResult {
  const { active, kind, toMeters, closeThresholdM = 0.5, onCommit } = options;
  const [draftPoints, setDraftPoints] = useState<number[][]>([]);
  const [saving, setSaving] = useState(false);

  // Сброс черновика при выключении режима или смене типа
  useEffect(() => {
    setDraftPoints([]);
  }, [active, kind]);

  // Обертка для вызова onCommit с установкой флага saving и обработкой ошибок
  const commit = useCallback(async (geometry: DrawGeometry) => {
    setSaving(true);
    try {
      await onCommit(geometry);
    } catch {
      // Ошибки проглатываются, их должен обрабатывать вызывающий
    } finally {
      setDraftPoints([]);
      setSaving(false);
    }
  }, [onCommit]);

  const handleStageTap = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!active || saving) return;

    const stage = e.target.getStage();
    if (!stage) return;

    const pos = stage.getRelativePointerPosition();
    if (!pos) return;

    const meters = toMeters(pos);
    // Округление до 2 знаков (сантиметры)
    const x = Math.round(meters.x * 100) / 100;
    const y = Math.round(meters.y * 100) / 100;

    if (kind === 'point') {
      void commit({ type: 'point', points: [[x, y]] });
      return;
    }

    if (kind === 'line') {
      setDraftPoints(prev => [...prev, [x, y]]);
      return;
    }

    if (kind === 'polygon') {
      if (draftPoints.length >= 3) {
        const first = draftPoints[0];
        const dist = Math.hypot(first[0] - x, first[1] - y);
        // Замыкание полигона тапом рядом с первой точкой
        if (dist <= closeThresholdM) {
          void commit({ type: 'polygon', points: draftPoints });
          return;
        }
      }
      setDraftPoints([...draftPoints, [x, y]]);
    }
  }, [active, saving, kind, draftPoints, toMeters, closeThresholdM, commit]);

  const finish = useCallback(() => {
    if (saving) return;

    if (kind === 'line' && draftPoints.length >= 2) {
      void commit({ type: 'line', points: draftPoints });
    } else if (kind === 'polygon' && draftPoints.length >= 3) {
      void commit({ type: 'polygon', points: draftPoints });
    }
  }, [saving, kind, draftPoints, commit]);

  const cancel = useCallback(() => {
    setDraftPoints([]);
  }, []);

  const canFinish = (kind === 'line' && draftPoints.length >= 2) ||
                    (kind === 'polygon' && draftPoints.length >= 3);

  return {
    draftPoints,
    handleStageTap,
    finish,
    cancel,
    canFinish,
    saving,
  };
}
