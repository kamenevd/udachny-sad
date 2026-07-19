/**
 * Тесты usePanZoom — rAF-коалесинг wheel-зума (задача 22.1).
 * Несколько wheel-событий за кадр → один флаш setState в rAF,
 * значения компаундятся от pending, resetView сбрасывает всё.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type Konva from 'konva';
import { usePanZoom } from '../components/canvas/usePanZoom';

// Управляемый requestAnimationFrame: колбэки копятся, flushRaf() запускает их
let rafCallbacks: Map<number, FrameRequestCallback>;
let rafSeq: number;
let cancelledIds: number[];

function flushRaf() {
  const pending = [...rafCallbacks.values()];
  rafCallbacks.clear();
  for (const cb of pending) cb(performance.now());
}

function makeWheelEvent(deltaY: number): Konva.KonvaEventObject<WheelEvent> {
  const stage = {
    getPointerPosition: () => ({ x: 100, y: 100 }),
  };
  return {
    evt: { preventDefault: vi.fn(), deltaY },
    target: { getStage: () => stage },
  } as unknown as Konva.KonvaEventObject<WheelEvent>;
}

beforeEach(() => {
  rafCallbacks = new Map();
  rafSeq = 0;
  cancelledIds = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafCallbacks.set(++rafSeq, cb);
    return rafSeq;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    cancelledIds.push(id);
    rafCallbacks.delete(id);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('usePanZoom — rAF-коалесинг', () => {
  it('wheel не меняет zoom до кадра rAF', () => {
    const { result } = renderHook(() => usePanZoom());

    act(() => {
      result.current.stageProps.onWheel(makeWheelEvent(-1));
    });

    expect(result.current.zoom).toBe(1);
    expect(rafCallbacks.size).toBe(1);
  });

  it('три wheel-события за кадр компаундятся в один флаш (1.05³)', () => {
    const { result } = renderHook(() => usePanZoom());

    act(() => {
      result.current.stageProps.onWheel(makeWheelEvent(-1));
      result.current.stageProps.onWheel(makeWheelEvent(-1));
      result.current.stageProps.onWheel(makeWheelEvent(-1));
    });

    // Один запланированный кадр на три события
    expect(rafCallbacks.size).toBe(1);

    act(() => {
      flushRaf();
    });

    expect(result.current.zoom).toBeCloseTo(1.05 ** 3, 5);
  });

  it('zoom ограничен maxZoom', () => {
    const { result } = renderHook(() => usePanZoom({ maxZoom: 1.1 }));

    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current.stageProps.onWheel(makeWheelEvent(-1));
      }
      flushRaf();
    });

    expect(result.current.zoom).toBeCloseTo(1.1, 5);
  });

  it('resetView отменяет запланированный кадр и возвращает zoom=1', () => {
    const { result } = renderHook(() => usePanZoom());

    act(() => {
      result.current.stageProps.onWheel(makeWheelEvent(-1));
      result.current.resetView();
    });

    expect(cancelledIds.length).toBe(1);
    expect(result.current.zoom).toBe(1);

    // Отменённый кадр не «воскрешает» pending-значения
    act(() => {
      flushRaf();
    });
    expect(result.current.zoom).toBe(1);
  });

  it('размонтирование отменяет запланированный кадр', () => {
    const { result, unmount } = renderHook(() => usePanZoom());

    act(() => {
      result.current.stageProps.onWheel(makeWheelEvent(-1));
    });

    unmount();
    expect(cancelledIds.length).toBe(1);
  });

  it('enabled=false игнорирует wheel', () => {
    const { result } = renderHook(() => usePanZoom({ enabled: false }));

    act(() => {
      result.current.stageProps.onWheel(makeWheelEvent(-1));
      flushRaf();
    });

    expect(result.current.zoom).toBe(1);
    expect(rafCallbacks.size).toBe(0);
  });
});
