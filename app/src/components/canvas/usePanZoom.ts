/**
 * usePanZoom — pan/zoom для Konva Stage (задача 3.1).
 * Touch: pinch-зум двумя пальцами, drag одним; десктоп: wheel-зум к курсору.
 * enabled=false отключает всё (для режимов рисования).
 *
 * Задача 22.1: rAF-коалесинг — wheel/touchmove не дёргают setState напрямую,
 * а накапливают целевые scale/position в ref; один requestAnimationFrame
 * на кадр флашит их в state → максимум один ре-рендер Stage за кадр.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type Konva from 'konva';

export interface UsePanZoomOptions {
  minZoom?: number;
  maxZoom?: number;
  enabled?: boolean;
}

export interface StagePanZoomProps {
  scaleX: number;
  scaleY: number;
  x: number;
  y: number;
  draggable: boolean;
  onWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  onTouchMove: (e: Konva.KonvaEventObject<TouchEvent>) => void;
  onTouchEnd: (e: Konva.KonvaEventObject<TouchEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
}

export interface UsePanZoomReturn {
  stageProps: StagePanZoomProps;
  zoom: number;
  resetView: () => void;
  /**
   * Задача H.1 — плавно центрирует точку модели `point` во вьюпорте `viewport`
   * (Konva-подобная анимация через rAF-твин), опционально доводя масштаб до
   * `targetScale`. Держит state pan/zoom в синхроне, без снапбэка.
   */
  focusOn: (
    point: { x: number; y: number },
    viewport: { width: number; height: number },
    targetScale?: number,
  ) => void;
}

interface PanZoomTarget {
  scale: number;
  position: { x: number; y: number };
}

export function usePanZoom(options?: UsePanZoomOptions): UsePanZoomReturn {
  const minZoom = options?.minZoom ?? 0.5;
  const maxZoom = options?.maxZoom ?? 8;
  const enabled = options?.enabled ?? true;

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPinching, setIsPinching] = useState(false);

  // Рефы для актуальных значений внутри коллбэков
  const stateRef = useRef({ scale, position });
  stateRef.current = { scale, position };

  const lastDist = useRef(0);
  const lastCenter = useRef<{ x: number; y: number } | null>(null);

  // Незафлашенные значения текущего кадра + id запланированного rAF
  const pendingRef = useRef<PanZoomTarget | null>(null);
  const rafRef = useRef(0);

  const flush = useCallback(() => {
    rafRef.current = 0;
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    setScale(pending.scale);
    setPosition(pending.position);
  }, []);

  /** Накопить целевые значения; флаш — один раз в кадр */
  const schedule = useCallback(
    (target: PanZoomTarget) => {
      pendingRef.current = target;
      if (rafRef.current === 0) {
        rafRef.current = requestAnimationFrame(flush);
      }
    },
    [flush],
  );

  /** Актуальные scale/position: pending текущего кадра, иначе state */
  const readCurrent = useCallback(
    (): PanZoomTarget => pendingRef.current ?? stateRef.current,
    [],
  );

  // Отмена запланированного кадра при размонтировании
  useEffect(
    () => () => {
      if (rafRef.current !== 0) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const resetView = useCallback(() => {
    if (rafRef.current !== 0) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    pendingRef.current = null;
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Задача H.1 — анимированное центрирование объекта (командная палитра).
  const focusRafRef = useRef(0);
  const focusOn = useCallback(
    (
      point: { x: number; y: number },
      viewport: { width: number; height: number },
      targetScale?: number,
    ) => {
      if (focusRafRef.current !== 0) cancelAnimationFrame(focusRafRef.current);
      if (rafRef.current !== 0) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
        pendingRef.current = null;
      }

      const from = stateRef.current;
      const toScale = Math.max(
        minZoom,
        Math.min(maxZoom, targetScale ?? Math.max(from.scale, 1.4)),
      );
      const toPos = {
        x: viewport.width / 2 - point.x * toScale,
        y: viewport.height / 2 - point.y * toScale,
      };

      const duration = 350;
      const start = performance.now();
      const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic

      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const k = ease(t);
        setScale(from.scale + (toScale - from.scale) * k);
        setPosition({
          x: from.position.x + (toPos.x - from.position.x) * k,
          y: from.position.y + (toPos.y - from.position.y) * k,
        });
        if (t < 1) {
          focusRafRef.current = requestAnimationFrame(step);
        } else {
          focusRafRef.current = 0;
        }
      };
      focusRafRef.current = requestAnimationFrame(step);
    },
    [minZoom, maxZoom],
  );

  useEffect(
    () => () => {
      if (focusRafRef.current !== 0) cancelAnimationFrame(focusRafRef.current);
    },
    [],
  );

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    if (!enabled) return;

    const stage = e.target.getStage();
    if (!stage) return;

    e.evt.preventDefault();

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Несколько wheel-событий за кадр компаундятся от pending-значений
    const { scale: oldScale, position: oldPos } = readCurrent();

    const mousePointTo = {
      x: (pointer.x - oldPos.x) / oldScale,
      y: (pointer.y - oldPos.y) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const factor = 1.05;
    const newScale = direction > 0 ? oldScale * factor : oldScale / factor;

    const clampedScale = Math.max(minZoom, Math.min(maxZoom, newScale));

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    schedule({ scale: clampedScale, position: newPos });
  }, [enabled, minZoom, maxZoom, readCurrent, schedule]);

  const handleTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    if (!enabled) return;

    // Обработка щипка (2 касания)
    if (e.evt.touches.length === 2) {
      e.evt.preventDefault();

      if (!isPinching) {
        setIsPinching(true);
      }

      const stage = e.target.getStage();
      if (!stage) return;

      const t1 = e.evt.touches[0];
      const t2 = e.evt.touches[1];
      if (!t1 || !t2) return;

      // Центр между пальцами относительно Stage
      const stageBox = stage.container().getBoundingClientRect();
      const p1 = { x: t1.clientX - stageBox.left, y: t1.clientY - stageBox.top };
      const p2 = { x: t2.clientX - stageBox.left, y: t2.clientY - stageBox.top };

      const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);

      if (!lastCenter.current || lastDist.current === 0) {
        lastCenter.current = center;
        lastDist.current = dist;
        return;
      }

      const { scale: oldScale, position: oldPos } = readCurrent();

      const scaleFactor = dist / lastDist.current;
      const newScale = Math.max(minZoom, Math.min(maxZoom, oldScale * scaleFactor));

      // Точка на канвасе под пальцами до жеста
      const canvasPoint = {
        x: (lastCenter.current.x - oldPos.x) / oldScale,
        y: (lastCenter.current.y - oldPos.y) / oldScale,
      };

      // Сдвигаем канвас так, чтобы canvasPoint остался под новым центром
      const newPos = {
        x: center.x - canvasPoint.x * newScale,
        y: center.y - canvasPoint.y * newScale,
      };

      schedule({ scale: newScale, position: newPos });

      lastCenter.current = center;
      lastDist.current = dist;
    }
  }, [enabled, isPinching, minZoom, maxZoom, readCurrent, schedule]);

  const handleTouchEnd = useCallback(() => {
    // Сброс рефов при отпускании
    lastCenter.current = null;
    lastDist.current = 0;

    if (isPinching) {
      setIsPinching(false);
    }
  }, [isPinching]);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (!enabled) return;

    const stage = e.target.getStage();
    if (!stage || e.target !== stage) return;

    // Синхронизируем позицию из Konva в State (одиночное событие — без rAF)
    setPosition({ x: stage.x(), y: stage.y() });
  }, [enabled]);

  const stageProps: StagePanZoomProps = {
    scaleX: scale,
    scaleY: scale,
    x: position.x,
    y: position.y,
    draggable: enabled && !isPinching,
    onWheel: handleWheel,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onDragEnd: handleDragEnd,
  };

  return {
    stageProps,
    zoom: scale,
    resetView,
    focusOn,
  };
}
