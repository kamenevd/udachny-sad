/**
 * EditorCanvas — SVG-канва редактора плана (EDITOR.md).
 *
 * Жесты без переключателя режимов:
 * - мышь: тянуть объект — перенос сразу (порог 4 px отличает клик),
 *   тянуть пустое место — панорама, колесо — зум к курсору;
 * - палец: тянуть ВЫДЕЛЕННЫЙ объект — перенос, всё остальное — панорама,
 *   два пальца — всегда зум/панорама. Чтобы подвинуть — сначала тапни.
 *   Случайно сдвинуть объект, панорамируя план, невозможно.
 *
 * Вся геометрия — чистые модули (geometry/guides/view), канва только
 * держит текущий жест и промежуточную форму до конца жеста.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  type Shape,
  type Vec,
  type RectHandle,
  type RectEdge,
  rectCorners,
  resizeRect,
  resizeRectEdge,
  resizeCircle,
  moveLineVertex,
  rotationFromPointer,
  snapAngle,
  normalizeAngle,
  shapeBBox,
  shapeCenter,
  shapeOutline,
  round2,
  ROT_STEP,
} from './geometry';
import { planMove, plotBBox, type GuideLine } from './guides';
import {
  type Viewport,
  worldToScreen,
  screenToWorld,
  panBy,
  pinch,
  zoomAt,
  clampToPlot,
} from './view';
import type { EditorDoc, EditorItem } from './model';
import { objectTypeDef, zoneConditionDef } from './model';
import { canvasColors } from '../theme/canvasColors';

// ─── Стили типов ────────────────────────────────────────────────────────

const OBJECT_FILL: Record<string, string> = {
  building: canvasColors.buildingFill,
  lawn: canvasColors.grassFill,
  path: canvasColors.pathFill,
  flowerbed: canvasColors.flowerFill,
  composition: canvasColors.compositionFill,
  hedge: canvasColors.hedgeFill,
  tree: canvasColors.treeFill,
  shrub: canvasColors.shrubFill,
  water: canvasColors.waterFill,
  gate: canvasColors.gateFill,
  other: canvasColors.surface,
};

const ZONE_FILL: Record<string, string> = {
  sunny: canvasColors.zoneSun,
  partial_shade: canvasColors.zonePartial,
  shade: canvasColors.zoneShadow,
};

const ZONE_BORDER: Record<string, string> = {
  sunny: canvasColors.zoneSunBorder,
  partial_shade: canvasColors.zonePartialBorder,
  shade: canvasColors.zoneShadowBorder,
};

const SELECT_COLOR = canvasColors.blueInk;
const GUIDE_COLOR = canvasColors.red;
const OUTSIDE_BG = '#EAE0C4';

// ─── Жесты ──────────────────────────────────────────────────────────────

type HandleKind =
  | { kind: 'corner'; c: RectHandle }
  | { kind: 'edge'; e: RectEdge }
  | { kind: 'rotate' }
  | { kind: 'radius' }
  | { kind: 'vertex'; index: number };

type Gesture =
  | { type: 'idle' }
  | {
      type: 'press';
      pointerId: number;
      startX: number;
      startY: number;
      itemId: string | null;
      /** Чем станет жест после порога: перенос объекта или панорама */
      moveRole: 'move' | 'pan';
      slop: number;
    }
  | { type: 'pan'; pointerId: number; lastX: number; lastY: number }
  | { type: 'pinch'; p1: number; p2: number }
  | {
      type: 'move';
      pointerId: number;
      itemId: string;
      startShape: Shape;
      startWorld: Vec;
      current: Shape;
      guides: GuideLine[];
    }
  | {
      type: 'handle';
      pointerId: number;
      itemId: string;
      handle: HandleKind;
      startShape: Shape;
      current: Shape;
    };

export interface EditorCanvasProps {
  doc: EditorDoc;
  plotW: number;
  plotH: number;
  viewport: Viewport;
  onViewportChange: (vp: Viewport) => void;
  /** Размер канвы в px — сообщается родителю для fit и «поставить в центр» */
  onViewSize?: (w: number, h: number) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  magnet: boolean;
  zonesVisible: boolean;
  /** Конец жеста: форма элемента изменилась */
  onShapeCommit: (id: string, shape: Shape) => void;
}

/** Формат метров: «6», «2,5» */
export function fmtM(v: number): string {
  return (Math.round(v * 100) / 100).toLocaleString('ru-RU');
}

export function EditorCanvas({
  doc,
  plotW,
  plotH,
  viewport,
  onViewportChange,
  onViewSize,
  selectedId,
  onSelect,
  magnet,
  zonesVisible,
  onShapeCommit,
}: EditorCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [gesture, setGestureState] = useState<Gesture>({ type: 'idle' });
  const gestureRef = useRef(gesture);
  // Реф обновляется СРАЗУ (не дожидаясь рендера): события жеста могут
  // прийти в одной синхронной пачке, и обработчики должны видеть свежее
  // состояние независимо от планировщика React.
  const setGesture = useCallback((g: Gesture) => {
    gestureRef.current = g;
    setGestureState(g);
  }, []);
  const pointers = useRef(new Map<number, Vec>());

  // Пропсы в ref — pointer-обработчики стабильны, но видят свежие значения
  const propsRef = useRef({ doc, viewport, magnet, plotW, plotH, selectedId, zonesVisible });
  propsRef.current = { doc, viewport, magnet, plotW, plotH, selectedId, zonesVisible };
  const cbRef = useRef({ onViewportChange, onSelect, onShapeCommit });
  cbRef.current = { onViewportChange, onSelect, onShapeCommit };

  // ─── Размер канвы ─────────────────────────────────────────────────────
  const [size, setSize] = useState({ w: 0, h: 0 });
  const sizeRef = useRef(size);
  sizeRef.current = size;
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
      onViewSize?.(r.width, r.height);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
    // onViewSize — стабильный setState родителя
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const localPoint = useCallback((e: { clientX: number; clientY: number }): Vec => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }, []);

  const setViewportClamped = useCallback((vp: Viewport) => {
    const { plotW: pw, plotH: ph } = propsRef.current;
    const { w, h } = sizeRef.current;
    cbRef.current.onViewportChange(clampToPlot(vp, pw, ph, w, h));
  }, []);

  // ─── Зум колесом (non-passive, чтобы страница не скроллилась) ─────────
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = localPoint(e);
      // Трекпад-пинч шлёт ctrlKey — масштабируем чувствительнее
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002));
      setViewportClamped(zoomAt(propsRef.current.viewport, p, factor));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [localPoint, setViewportClamped]);

  // ─── Жест: применение движения ────────────────────────────────────────

  const applyHandleMove = useCallback((g: Extract<Gesture, { type: 'handle' }>, world: Vec): Shape => {
    const { magnet: snapOn } = propsRef.current;
    const s = g.startShape;
    switch (g.handle.kind) {
      case 'corner':
        return s.kind === 'rect' ? resizeRect(s, g.handle.c, world, snapOn) : g.current;
      case 'edge':
        return s.kind === 'rect' ? resizeRectEdge(s, g.handle.e, world, snapOn) : g.current;
      case 'rotate': {
        if (s.kind !== 'rect') return g.current;
        const raw = rotationFromPointer(shapeCenter(s), world);
        const rot = snapOn ? snapAngle(raw, ROT_STEP) : Math.round(normalizeAngle(raw));
        return { ...s, rot };
      }
      case 'radius':
        return s.kind === 'circle' ? resizeCircle(s, world, snapOn) : g.current;
      case 'vertex':
        return s.kind === 'line' ? moveLineVertex(s, g.handle.index, world, snapOn) : g.current;
    }
  }, []);

  const finishGesture = useCallback(() => {
    const g = gestureRef.current;
    if (g.type === 'move' || g.type === 'handle') {
      if (JSON.stringify(g.current) !== JSON.stringify(getItem(propsRef.current.doc, g.itemId)?.shape)) {
        cbRef.current.onShapeCommit(g.itemId, g.current);
      }
    }
    setGesture({ type: 'idle' });
  }, [setGesture]);

  // ─── Pointer events ───────────────────────────────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, itemId: string | null, handle?: HandleKind) => {
      const p = localPoint(e);
      pointers.current.set(e.pointerId, p);
      try {
        svgRef.current?.setPointerCapture(e.pointerId);
      } catch {
        // Синтетические события (тесты) не имеют живого pointerId
      }
      const g = gestureRef.current;
      const isTouch = e.pointerType !== 'mouse';
      const { doc: d, selectedId: sel, viewport: vp } = propsRef.current;

      // Второй палец во время панорамы/нажатия → пинч
      if ((g.type === 'pan' || g.type === 'press') && pointers.current.size === 2) {
        const ids = [...pointers.current.keys()];
        setGesture({ type: 'pinch', p1: ids[0], p2: ids[1] });
        return;
      }
      // Лишние пальцы в остальных жестах игнорируем
      if (g.type !== 'idle') return;

      if (handle && itemId) {
        const item = getItem(d, itemId);
        if (!item) return;
        setGesture({
          type: 'handle',
          pointerId: e.pointerId,
          itemId,
          handle,
          startShape: item.shape,
          current: item.shape,
        });
        return;
      }

      // Мышь двигает любой объект сразу; палец — только выделенный
      const canMove = itemId !== null && (!isTouch || itemId === sel);
      if (!isTouch && itemId && itemId !== sel) cbRef.current.onSelect(itemId);
      setGesture({
        type: 'press',
        pointerId: e.pointerId,
        startX: p.x,
        startY: p.y,
        itemId,
        moveRole: canMove ? 'move' : 'pan',
        slop: isTouch ? 9 : 4,
      });
      void vp;
    },
    [localPoint, setGesture],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      const p = localPoint(e);
      const g = gestureRef.current;
      const { doc: d, viewport: vp, magnet: snapOn, plotW: pw, plotH: ph } = propsRef.current;

      switch (g.type) {
        case 'press': {
          if (e.pointerId !== g.pointerId) break;
          const dist = Math.hypot(p.x - g.startX, p.y - g.startY);
          if (dist < g.slop) break;
          if (g.moveRole === 'move' && g.itemId) {
            const item = getItem(d, g.itemId);
            if (!item) break;
            setGesture({
              type: 'move',
              pointerId: g.pointerId,
              itemId: g.itemId,
              startShape: item.shape,
              startWorld: screenToWorld(vp, { x: g.startX, y: g.startY }),
              current: item.shape,
              guides: [],
            });
          } else {
            setGesture({ type: 'pan', pointerId: g.pointerId, lastX: p.x, lastY: p.y });
          }
          break;
        }
        case 'pan': {
          if (e.pointerId !== g.pointerId) break;
          setViewportClamped(panBy(vp, p.x - g.lastX, p.y - g.lastY));
          setGesture({ ...g, lastX: p.x, lastY: p.y });
          break;
        }
        case 'pinch': {
          const a1 = pointers.current.get(g.p1);
          const b1 = pointers.current.get(g.p2);
          if (!a1 || !b1) break;
          const a2 = e.pointerId === g.p1 ? p : a1;
          const b2 = e.pointerId === g.p2 ? p : b1;
          setViewportClamped(pinch(vp, a1, b1, a2, b2));
          break;
        }
        case 'move': {
          if (e.pointerId !== g.pointerId) break;
          const world = screenToWorld(vp, p);
          const rawDx = world.x - g.startWorld.x;
          const rawDy = world.y - g.startWorld.y;
          const others = allItems(d)
            .filter((i) => i.id !== g.itemId)
            .filter((i) => i.kind === 'object' || propsRef.current.zonesVisible)
            .map((i) => shapeBBox(i.shape));
          const plan = planMove(g.startShape, rawDx, rawDy, {
            targets: [...others, plotBBox(pw, ph)],
            magnet: snapOn,
            guideThreshold: 8 / vp.scale,
          });
          setGesture({ ...g, current: plan.shape, guides: plan.guides });
          break;
        }
        case 'handle': {
          if (e.pointerId !== g.pointerId) break;
          const world = screenToWorld(vp, p);
          setGesture({ ...g, current: applyHandleMove(g, world) });
          break;
        }
        default:
          break;
      }
      pointers.current.set(e.pointerId, p);
    },
    [localPoint, setViewportClamped, applyHandleMove, setGesture],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const g = gestureRef.current;
      pointers.current.delete(e.pointerId);

      if (g.type === 'press' && e.pointerId === g.pointerId) {
        // Тап: выделить объект или снять выделение
        cbRef.current.onSelect(g.itemId);
        setGesture({ type: 'idle' });
        return;
      }
      if (g.type === 'pinch') {
        const rest = [...pointers.current.keys()];
        if (rest.length >= 1) {
          const keep = pointers.current.get(rest[0])!;
          setGesture({ type: 'pan', pointerId: rest[0], lastX: keep.x, lastY: keep.y });
        } else {
          setGesture({ type: 'idle' });
        }
        return;
      }
      if (
        (g.type === 'pan' || g.type === 'move' || g.type === 'handle') &&
        e.pointerId !== g.pointerId
      ) {
        return; // отпустили не тот палец
      }
      finishGesture();
    },
    [finishGesture, setGesture],
  );

  // ─── Живой документ: форма из активного жеста поверх doc ─────────────

  const liveShape = gesture.type === 'move' || gesture.type === 'handle' ? gesture.current : null;
  const liveItemId = gesture.type === 'move' || gesture.type === 'handle' ? gesture.itemId : null;

  const shapeOf = useCallback(
    (item: EditorItem): Shape => (item.id === liveItemId && liveShape ? liveShape : item.shape),
    [liveItemId, liveShape],
  );

  const guides = gesture.type === 'move' ? gesture.guides : [];

  // ─── Сетка (мемо по уровню детализации) ───────────────────────────────
  const gridLevel = viewport.scale >= 16 ? 0.5 : viewport.scale >= 7 ? 1 : 5;
  const gridLines = useMemo(() => makeGridLines(plotW, plotH, gridLevel), [plotW, plotH, gridLevel]);

  const selected = selectedId ? getItem(doc, selectedId) : undefined;

  const scale = viewport.scale;
  const cursor =
    gesture.type === 'pan' || gesture.type === 'pinch'
      ? 'grabbing'
      : gesture.type === 'move'
        ? 'move'
        : 'grab';

  return (
    <svg
      ref={svgRef}
      data-testid="plot-canvas"
      className="h-full w-full touch-none select-none"
      style={{ background: OUTSIDE_BG, cursor, display: 'block' }}
      onPointerDown={(e) => handlePointerDown(e, null)}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <g transform={`translate(${viewport.tx} ${viewport.ty}) scale(${scale})`}>
        {/* Тень + лист участка */}
        <rect
          x={4 / scale}
          y={4 / scale}
          width={plotW}
          height={plotH}
          fill="rgba(32,42,56,.25)"
        />
        <rect
          x={0}
          y={0}
          width={plotW}
          height={plotH}
          fill={canvasColors.paper}
          stroke={canvasColors.ink}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
        />

        {/* Сетка */}
        <g>
          {gridLines.map((l) => (
            <line
              key={l.key}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke={l.major ? canvasColors.gridBlue5 : canvasColors.gridBlue}
              strokeWidth={l.major ? 1.4 : 1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>

        {/* Габариты участка */}
        {scale >= 5 && (
          <text
            x={plotW / 2}
            y={-8 / scale}
            textAnchor="middle"
            fontSize={12 / scale}
            fill={canvasColors.inkMuted}
            fontFamily="'PT Mono', monospace"
          >
            {fmtM(plotW)} × {fmtM(plotH)} м
          </text>
        )}

        {/* Зоны света — под объектами */}
        {zonesVisible &&
          doc.zones.map((zone) => (
            <ZoneShape
              key={zone.id}
              id={zone.id}
              shape={shapeOf(zone)}
              condition={zone.condition}
              scale={scale}
              selected={zone.id === selectedId}
              onPointerDown={(e) => {
                e.stopPropagation();
                handlePointerDown(e, zone.id);
              }}
            />
          ))}

        {/* Объекты */}
        {doc.objects.map((obj) => (
          <ObjectShape
            key={obj.id}
            id={obj.id}
            type={obj.type}
            label={obj.label}
            shape={shapeOf(obj)}
            scale={scale}
            onPointerDown={(e) => {
              e.stopPropagation();
              handlePointerDown(e, obj.id);
            }}
          />
        ))}
      </g>

      {/* ── Экранный слой: выделение, ручки, направляющие, бейдж ── */}
      {guides.map((gl, i) => (
        <GuideLineView key={i} guide={gl} viewport={viewport} />
      ))}

      {selected && (
        <SelectionChrome
          item={selected}
          shape={shapeOf(selected)}
          viewport={viewport}
          gesture={gesture}
          onHandleDown={(e, handle) => {
            e.stopPropagation();
            handlePointerDown(e, selected.id, handle);
          }}
        />
      )}
    </svg>
  );
}

// ─── Вспомогательные ────────────────────────────────────────────────────

function getItem(doc: EditorDoc, id: string): EditorItem | undefined {
  return doc.objects.find((o) => o.id === id) ?? doc.zones.find((z) => z.id === id);
}

function allItems(doc: EditorDoc): EditorItem[] {
  return [...doc.objects, ...doc.zones];
}

interface GridLine {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  major: boolean;
}

function makeGridLines(plotW: number, plotH: number, step: number): GridLine[] {
  const lines: GridLine[] = [];
  for (let x = step; x < plotW; x += step) {
    const v = Math.round(x * 100) / 100;
    lines.push({ key: `v${v}`, x1: v, y1: 0, x2: v, y2: plotH, major: v % 5 === 0 });
  }
  for (let y = step; y < plotH; y += step) {
    const v = Math.round(y * 100) / 100;
    lines.push({ key: `h${v}`, x1: 0, y1: v, x2: plotW, y2: v, major: v % 5 === 0 });
  }
  return lines;
}

/** Путь формы в мировых координатах */
function shapePathEl(
  shape: Shape,
  common: React.SVGProps<SVGRectElement> & React.SVGProps<SVGCircleElement> & React.SVGProps<SVGPolygonElement>,
) {
  switch (shape.kind) {
    case 'rect':
      return (
        <rect
          x={shape.cx - shape.w / 2}
          y={shape.cy - shape.h / 2}
          width={shape.w}
          height={shape.h}
          transform={shape.rot ? `rotate(${shape.rot} ${shape.cx} ${shape.cy})` : undefined}
          {...common}
        />
      );
    case 'circle':
      return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...common} />;
    case 'line':
    case 'poly':
      return <polygon points={shapeOutline(shape).map((p) => p.join(',')).join(' ')} {...common} />;
  }
}

// ─── Объект ─────────────────────────────────────────────────────────────

function ObjectShape({
  id,
  type,
  label,
  shape,
  scale,
  onPointerDown,
}: {
  id: string;
  type: string;
  label?: string;
  shape: Shape;
  scale: number;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const def = objectTypeDef(type);
  const fill = OBJECT_FILL[type] ?? canvasColors.surface;
  const box = shapeBBox(shape);
  const minDimPx = Math.min(box.maxX - box.minX, box.maxY - box.minY) * scale;
  const center = shapeCenter(shape);

  const showIcon = minDimPx >= 22;
  const showLabel = !!label && minDimPx >= 64;
  const iconSize = Math.min(28, Math.max(12, minDimPx * 0.34)) / scale;

  return (
    <g
      data-item-id={id}
      data-type={type}
      onPointerDown={onPointerDown}
      style={{ cursor: 'move' }}
    >
      {shapePathEl(shape, {
        fill,
        stroke: canvasColors.ink,
        strokeWidth: 1.5,
        vectorEffect: 'non-scaling-stroke',
        strokeLinejoin: 'round',
      })}
      {/* Осевая линия дорожки/изгороди */}
      {shape.kind === 'line' && (
        <polyline
          points={shape.pts.map((p) => p.join(',')).join(' ')}
          fill="none"
          stroke={canvasColors.ink}
          strokeWidth={1}
          strokeDasharray="6 4"
          opacity={0.35}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {/* Увеличенная хит-зона для мелких объектов (палец ≥ 44 px) */}
      {shape.kind === 'circle' && shape.r * scale < 22 && (
        <circle cx={shape.cx} cy={shape.cy} r={22 / scale} fill="transparent" />
      )}
      {shape.kind === 'line' && (
        <polyline
          points={shape.pts.map((p) => p.join(',')).join(' ')}
          fill="none"
          stroke="transparent"
          strokeWidth={Math.max(shape.width, 30 / scale)}
        />
      )}
      {showIcon && (
        <text
          x={center.x}
          y={center.y + (showLabel ? -2 / scale : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={iconSize}
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {def.icon}
        </text>
      )}
      {showLabel && (
        <text
          x={center.x}
          y={center.y + iconSize * 0.9}
          textAnchor="middle"
          dominantBaseline="hanging"
          fontSize={11 / scale}
          fill={canvasColors.ink}
          fontFamily="'PT Mono', monospace"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {label}
        </text>
      )}
    </g>
  );
}

// ─── Зона света ─────────────────────────────────────────────────────────

function ZoneShape({
  id,
  shape,
  condition,
  scale,
  selected,
  onPointerDown,
}: {
  id: string;
  shape: Shape;
  condition: string;
  scale: number;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  const def = zoneConditionDef(condition);
  const center = shapeCenter(shape);
  const box = shapeBBox(shape);
  const minDimPx = Math.min(box.maxX - box.minX, box.maxY - box.minY) * scale;

  return (
    <g data-item-id={id} data-zone-condition={condition} onPointerDown={onPointerDown} style={{ cursor: 'move' }}>
      {shapePathEl(shape, {
        fill: ZONE_FILL[condition] ?? ZONE_FILL.sunny,
        stroke: ZONE_BORDER[condition] ?? ZONE_BORDER.sunny,
        strokeWidth: selected ? 2 : 1.5,
        strokeDasharray: '7 5',
        vectorEffect: 'non-scaling-stroke',
      })}
      {minDimPx >= 48 && (
        <text
          x={center.x}
          y={center.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={12 / scale}
          fill={canvasColors.ink}
          fontFamily="'PT Mono', monospace"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {def.icon} {def.label}
        </text>
      )}
    </g>
  );
}

// ─── Направляющая ───────────────────────────────────────────────────────

function GuideLineView({ guide, viewport }: { guide: GuideLine; viewport: Viewport }) {
  if (guide.axis === 'x') {
    const a = worldToScreen(viewport, { x: guide.at, y: guide.from });
    const b = worldToScreen(viewport, { x: guide.at, y: guide.to });
    return <line x1={a.x} y1={a.y - 12} x2={b.x} y2={b.y + 12} stroke={GUIDE_COLOR} strokeWidth={1} />;
  }
  const a = worldToScreen(viewport, { x: guide.from, y: guide.at });
  const b = worldToScreen(viewport, { x: guide.to, y: guide.at });
  return <line x1={a.x - 12} y1={a.y} x2={b.x + 12} y2={b.y} stroke={GUIDE_COLOR} strokeWidth={1} />;
}

// ─── Выделение и ручки (экранные координаты) ────────────────────────────

const HANDLE_VISUAL = 11;
const HANDLE_HIT = 44;

function Handle({
  x,
  y,
  shape: visual,
  cursor,
  testId,
  onPointerDown,
}: {
  x: number;
  y: number;
  shape: 'square' | 'circle' | 'pill-h' | 'pill-v';
  cursor: string;
  testId: string;
  onPointerDown: (e: React.PointerEvent) => void;
}) {
  return (
    <g onPointerDown={onPointerDown} data-handle={testId} style={{ cursor }}>
      {visual === 'square' && (
        <rect
          x={x - HANDLE_VISUAL / 2}
          y={y - HANDLE_VISUAL / 2}
          width={HANDLE_VISUAL}
          height={HANDLE_VISUAL}
          fill="#fff"
          stroke={SELECT_COLOR}
          strokeWidth={1.5}
          rx={2}
        />
      )}
      {visual === 'circle' && (
        <circle cx={x} cy={y} r={HANDLE_VISUAL / 2 + 1} fill="#fff" stroke={SELECT_COLOR} strokeWidth={1.5} />
      )}
      {visual === 'pill-h' && (
        <rect x={x - 9} y={y - 3.5} width={18} height={7} rx={3.5} fill="#fff" stroke={SELECT_COLOR} strokeWidth={1.5} />
      )}
      {visual === 'pill-v' && (
        <rect x={x - 3.5} y={y - 9} width={7} height={18} rx={3.5} fill="#fff" stroke={SELECT_COLOR} strokeWidth={1.5} />
      )}
      {/* Прозрачная хит-зона ≥44 px */}
      <circle cx={x} cy={y} r={HANDLE_HIT / 2} fill="transparent" />
    </g>
  );
}

function SelectionChrome({
  item,
  shape,
  viewport,
  gesture,
  onHandleDown,
}: {
  item: EditorItem;
  shape: Shape;
  viewport: Viewport;
  gesture: Gesture;
  onHandleDown: (e: React.PointerEvent, handle: HandleKind) => void;
}) {
  const toS = (p: [number, number]) => worldToScreen(viewport, { x: p[0], y: p[1] });
  const busyHandle = gesture.type === 'handle' ? gesture.handle : null;
  const isBusy = gesture.type === 'move' || gesture.type === 'handle';

  // Бейдж размеров во время жеста
  let badge: string | null = null;
  if (isBusy) {
    if (shape.kind === 'rect') {
      badge =
        busyHandle?.kind === 'rotate'
          ? `${Math.round(shape.rot)}°`
          : `${fmtM(shape.w)} × ${fmtM(shape.h)} м`;
    } else if (shape.kind === 'circle') {
      badge = `⌀ ${fmtM(shape.r * 2)} м`;
    } else if (shape.kind === 'line' && busyHandle?.kind === 'vertex') {
      const i = busyHandle.index;
      const j = i > 0 ? i - 1 : i + 1;
      if (shape.pts[j]) {
        const len = Math.hypot(
          shape.pts[i][0] - shape.pts[j][0],
          shape.pts[i][1] - shape.pts[j][1],
        );
        badge = `${fmtM(round2(len))} м`;
      }
    }
  }

  const box = shapeBBox(shape);
  const badgePos = worldToScreen(viewport, { x: (box.minX + box.maxX) / 2, y: box.minY });

  let chrome: React.ReactNode = null;

  if (shape.kind === 'rect') {
    const corners = rectCorners(shape).map(toS);
    const cornerNames: RectHandle[] = ['nw', 'ne', 'se', 'sw'];
    const cornerCursors = ['nwse-resize', 'nesw-resize', 'nwse-resize', 'nesw-resize'];
    const edges: { e: RectEdge; a: number; b: number }[] = [
      { e: 'n', a: 0, b: 1 },
      { e: 'e', a: 1, b: 2 },
      { e: 's', a: 2, b: 3 },
      { e: 'w', a: 3, b: 0 },
    ];
    // Ручка поворота: над верхней кромкой, наружу от центра
    const centerS = worldToScreen(viewport, shapeCenter(shape));
    const topMid = { x: (corners[0].x + corners[1].x) / 2, y: (corners[0].y + corners[1].y) / 2 };
    const outLen = Math.hypot(topMid.x - centerS.x, topMid.y - centerS.y) || 1;
    const rotPos = {
      x: topMid.x + ((topMid.x - centerS.x) / outLen) * 30,
      y: topMid.y + ((topMid.y - centerS.y) / outLen) * 30,
    };
    // Наклон кромок для pill-ручек: горизонтальна ли кромка на экране
    const edgeHorizontal = (a: Vec, b: Vec) => Math.abs(b.x - a.x) >= Math.abs(b.y - a.y);

    chrome = (
      <>
        <polygon
          points={corners.map((c) => `${c.x},${c.y}`).join(' ')}
          fill="none"
          stroke={SELECT_COLOR}
          strokeWidth={1.5}
        />
        <line x1={topMid.x} y1={topMid.y} x2={rotPos.x} y2={rotPos.y} stroke={SELECT_COLOR} strokeWidth={1.5} />
        {edges.map(({ e, a, b }) => {
          const mid = {
            x: (corners[a].x + corners[b].x) / 2,
            y: (corners[a].y + corners[b].y) / 2,
          };
          const horizontal = edgeHorizontal(corners[a], corners[b]);
          return (
            <Handle
              key={e}
              x={mid.x}
              y={mid.y}
              shape={horizontal ? 'pill-h' : 'pill-v'}
              cursor={horizontal ? 'ns-resize' : 'ew-resize'}
              testId={`edge-${e}`}
              onPointerDown={(ev) => onHandleDown(ev, { kind: 'edge', e })}
            />
          );
        })}
        {corners.map((c, i) => (
          <Handle
            key={cornerNames[i]}
            x={c.x}
            y={c.y}
            shape="square"
            cursor={cornerCursors[i]}
            testId={`corner-${cornerNames[i]}`}
            onPointerDown={(ev) => onHandleDown(ev, { kind: 'corner', c: cornerNames[i] })}
          />
        ))}
        <Handle
          x={rotPos.x}
          y={rotPos.y}
          shape="circle"
          cursor="crosshair"
          testId="rotate"
          onPointerDown={(ev) => onHandleDown(ev, { kind: 'rotate' })}
        />
      </>
    );
  } else if (shape.kind === 'circle') {
    const c = worldToScreen(viewport, { x: shape.cx, y: shape.cy });
    const rPx = shape.r * viewport.scale;
    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    chrome = (
      <>
        <circle cx={c.x} cy={c.y} r={rPx} fill="none" stroke={SELECT_COLOR} strokeWidth={1.5} />
        {dirs.map((d, i) => (
          <Handle
            key={i}
            x={c.x + d.dx * rPx}
            y={c.y + d.dy * rPx}
            shape="square"
            cursor={d.dx ? 'ew-resize' : 'ns-resize'}
            testId={`radius-${i}`}
            onPointerDown={(ev) => onHandleDown(ev, { kind: 'radius' })}
          />
        ))}
      </>
    );
  } else if (shape.kind === 'line') {
    const pts = shape.pts.map(toS);
    chrome = (
      <>
        <polygon
          points={shapeOutline(shape)
            .map((p) => {
              const s = toS(p);
              return `${s.x},${s.y}`;
            })
            .join(' ')}
          fill="none"
          stroke={SELECT_COLOR}
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
        {pts.map((p, i) => (
          <Handle
            key={i}
            x={p.x}
            y={p.y}
            shape="circle"
            cursor="move"
            testId={`vertex-${i}`}
            onPointerDown={(ev) => onHandleDown(ev, { kind: 'vertex', index: i })}
          />
        ))}
      </>
    );
  } else {
    // poly — только рамка (перенос и удаление, без параметрических ручек)
    const b = shapeBBox(shape);
    const a = worldToScreen(viewport, { x: b.minX, y: b.minY });
    const z = worldToScreen(viewport, { x: b.maxX, y: b.maxY });
    chrome = (
      <rect
        x={a.x}
        y={a.y}
        width={z.x - a.x}
        height={z.y - a.y}
        fill="none"
        stroke={SELECT_COLOR}
        strokeWidth={1.5}
        strokeDasharray="5 4"
      />
    );
  }

  return (
    <g data-selection-for={item.id}>
      {chrome}
      {badge && (
        <g style={{ pointerEvents: 'none' }}>
          <rect
            x={badgePos.x - badge.length * 4.2 - 8}
            y={badgePos.y - 44}
            width={badge.length * 8.4 + 16}
            height={26}
            rx={6}
            fill={canvasColors.ink}
            opacity={0.92}
          />
          <text
            x={badgePos.x}
            y={badgePos.y - 31}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={13}
            fill={canvasColors.paper}
            fontFamily="'PT Mono', monospace"
          >
            {badge}
          </text>
        </g>
      )}
    </g>
  );
}
