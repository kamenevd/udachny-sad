/**
 * GardenDetail — экран участка с Konva-канвой и атрибутами генплана.
 * DESIGN.md v5.1 §3.1 (Лист), §3.2 (Объекты), §3.4 (Атрибуты), §6 (Шапка).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Stage, Layer, Rect, Line, Circle, Shape, Group } from 'react-konva';
import type { KonvaNodeComponent } from 'react-konva';
import type Konva from 'konva';
import { canvasColors } from '../theme/canvasColors';
import {
  gridPattern,
  gridPattern5,
  grassPattern,
  gravelPattern,
  flowerPattern,
  buildingPattern,
  greenhousePattern,
  drawBedPattern,
  drawWaterPattern,
  drawTreeCrown,
  drawShrubCrown,
} from '../theme/canvasPatterns';
import { getTimeOfDay, getSkyGradient, isNightMode } from '../theme/sky';
import { ObjectNumbers } from '../components/canvas/ObjectNumbers';
import type { SchemaObjectForNumber } from '../components/canvas/ObjectNumbers';
import { useExplicationData, groupKey } from '../components/canvas/useExplicationData';
import type { SchemaObjectData } from '../components/canvas/useExplicationData';
import { GenplanAttributes } from '../components/canvas/GenplanAttributes';
import { Explication } from '../components/Explication';

// ─── Props ───────────────────────────────────────────────────────────

interface GardenDetailProps {
  gardenName: string;
  onBack: () => void;
}

// ─── Константы ───────────────────────────────────────────────────────

/** Ширина участка в метрах */
const PLOT_WIDTH_M = 20;
/** Высота участка в метрах */
const PLOT_HEIGHT_M = 30;
/** Масштаб по умолчанию: пикселей на метр (1:100) */
const DEFAULT_SCALE = 20;
/** Фон за рамкой листа (DESIGN.md §3.1) */
const BG_OUTSIDE_SHEET = '#EFE5C9';
/** Отступ внутренней рамки от внешней (§3.1) */
const SHEET_INSET = 5;
/** Отступ участка от краёв Stage при центрировании */
const PLOT_PADDING = 28;

/** Радиусы крон точечных объектов в метрах */
const TREE_RADIUS_M = 2.5;
const SHRUB_RADIUS_M = 1.0;
const GATE_RADIUS_M = 0.5;

function pointRadiusM(type: string): number {
  switch (type) {
    case 'tree':
      return TREE_RADIUS_M;
    case 'shrub':
      return SHRUB_RADIUS_M;
    case 'gate':
      return GATE_RADIUS_M;
    default:
      return 1;
  }
}

// ─── Мок-данные (участок ~20м × 30м) ─────────────────────────────────

const mockObjects: SchemaObjectData[] = [
  {
    id: 'b1',
    type: 'building',
    label: 'Дом',
    geometry: { type: 'polygon', points: [[2, 2], [8, 2], [8, 5], [2, 5]] },
  },
  {
    id: 'g1',
    type: 'greenhouse',
    geometry: { type: 'polygon', points: [[10, 2], [14, 2], [14, 5], [10, 5]] },
  },
  {
    id: 'bed1',
    type: 'bed',
    geometry: { type: 'polygon', points: [[2, 8], [6, 8], [6, 12], [2, 12]] },
  },
  {
    id: 'fb1',
    type: 'flowerbed',
    geometry: { type: 'polygon', points: [[8, 10], [11, 10], [11, 13], [8, 13]] },
  },
  {
    id: 't1',
    type: 'tree',
    label: 'Яблоня Антоновка',
    geometry: { type: 'point', points: [[5, 18]] },
  },
  {
    id: 't2',
    type: 'tree',
    label: 'Яблоня Антоновка',
    geometry: { type: 'point', points: [[7, 18]] },
  },
  {
    id: 't3',
    type: 'tree',
    label: 'Яблоня Антоновка',
    geometry: { type: 'point', points: [[9, 18]] },
  },
  {
    id: 's1',
    type: 'shrub',
    geometry: { type: 'point', points: [[14, 12]] },
  },
  {
    id: 'w1',
    type: 'water',
    geometry: { type: 'polygon', points: [[14, 20], [18, 20], [18, 24], [14, 24]] },
  },
];

// ─── Стиль объектов по типу (§3.2) ───────────────────────────────────

type PatternKind = 'image' | 'bed' | 'water' | null;

interface TypeStyle {
  fill: string;
  pattern: PatternKind;
  /** Ключ в карте загруженных паттернов (building, greenhouse, grass, gravel, flower) */
  patternKey?: string;
}

const typeStyle: Record<string, TypeStyle> = {
  building: { fill: canvasColors.buildingFill, pattern: 'image', patternKey: 'building' },
  greenhouse: { fill: canvasColors.greenhouseFill, pattern: 'image', patternKey: 'greenhouse' },
  lawn: { fill: canvasColors.grassFill, pattern: 'image', patternKey: 'grass' },
  path: { fill: canvasColors.pathFill, pattern: 'image', patternKey: 'gravel' },
  flowerbed: { fill: canvasColors.flowerFill, pattern: 'image', patternKey: 'flower' },
  bed: { fill: canvasColors.bedFill, pattern: 'bed' },
  water: { fill: canvasColors.waterFill, pattern: 'water' },
};

// ─── Загрузка data-URI паттернов как HTMLImageElement ────────────────

const PATTERN_URIS: Record<string, string> = {
  grid: gridPattern,
  grid5: gridPattern5,
  grass: grassPattern,
  gravel: gravelPattern,
  flower: flowerPattern,
  building: buildingPattern,
  greenhouse: greenhousePattern,
};

/**
 * Загружает все data-URI паттерны в HTMLImageElement.
 * Возвращает пустой объект до завершения загрузки — Konva обновится при готовности.
 */
function usePatternImages(): Record<string, HTMLImageElement> {
  const [images, setImages] = useState<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    let cancelled = false;
    const loaded: Record<string, HTMLImageElement> = {};
    const keys = Object.keys(PATTERN_URIS);
    let remaining = keys.length;

    const flush = () => {
      if (!cancelled) setImages({ ...loaded });
    };

    keys.forEach((key) => {
      const img = new Image();
      img.onload = () => {
        loaded[key] = img;
        remaining -= 1;
        if (remaining === 0) flush();
      };
      img.onerror = () => {
        remaining -= 1;
        if (remaining === 0) flush();
      };
      img.src = PATTERN_URIS[key];
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return images;
}

// ─── Компонент ───────────────────────────────────────────────────────

export function GardenDetail({ gardenName, onBack }: GardenDetailProps) {
  // ─── Время суток / небо (§6) ──────────────────────────────────────
  const timeOfDay = getTimeOfDay();
  const skyGradient = getSkyGradient(timeOfDay);
  const night = isNightMode(timeOfDay);
  const headerTextColor = night ? 'text-white' : 'text-ink';

  // ─── Размеры контейнера канвы ─────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      setCanvasSize({ width: el.clientWidth, height: el.clientHeight });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ─── Масштаб: вписываем участок, не более 1:100 ───────────────────
  const scale = useMemo(() => {
    const fitX = (canvasSize.width - PLOT_PADDING * 2) / PLOT_WIDTH_M;
    const fitY = (canvasSize.height - PLOT_PADDING * 2) / PLOT_HEIGHT_M;
    const fit = Math.max(2, Math.min(fitX, fitY));
    return Math.min(DEFAULT_SCALE, fit);
  }, [canvasSize.width, canvasSize.height]);

  // Центрируем лист в канве
  const plotWPx = PLOT_WIDTH_M * scale;
  const plotHPx = PLOT_HEIGHT_M * scale;
  const offsetX = Math.max(0, (canvasSize.width - plotWPx) / 2);
  const offsetY = Math.max(0, (canvasSize.height - plotHPx) / 2);

  // Конвертеры метров → пиксели
  const mx = useCallback((m: number) => m * scale + offsetX, [scale, offsetX]);
  const my = useCallback((m: number) => m * scale + offsetY, [scale, offsetY]);

  // ─── Паттерны ─────────────────────────────────────────────────────
  const patternImages = usePatternImages();

  // ─── Экспликация / номера (§3.4) ──────────────────────────────────
  const { items, groupMap } = useExplicationData(mockObjects);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);

  // Объекты с пиксельными координатами для ObjectNumbers
  const objectsForNumbers: SchemaObjectForNumber[] = useMemo(
    () =>
      mockObjects.map((o) => ({
        id: o.id,
        type: o.type,
        label: o.label,
        geometry: {
          type: o.geometry.type,
          points: o.geometry.points.map(([x, y]) => [mx(x), my(y)] as number[]),
        },
      })),
    [mx, my],
  );

  // Проверка принадлежности объекта к выделенной группе
  const isObjectSelected = useCallback(
    (obj: SchemaObjectData) => {
      if (selectedNumber == null) return false;
      return groupMap.get(groupKey(obj)) === selectedNumber;
    },
    [selectedNumber, groupMap],
  );

  // ─── Производные рендера ──────────────────────────────────────────
  const showAttributes = scale >= 10;

  return (
    <div className="flex h-[100dvh] flex-col bg-surface">
      {/* ═══ Шапка (§6) ═══ */}
      <header
        className="relative h-[72px] shrink-0"
        style={{ background: skyGradient }}
      >
        {/* Плашка-бланк: paper + двойная рамка + тень */}
        <div
          className={[
            'absolute inset-2 flex items-center gap-3 px-4',
            'border-2 border-ink bg-paper shadow-blank',
            'outline-1 outline-ink outline-offset-[-5px]',
          ].join(' ')}
        >
          {/* Кнопка «Назад» */}
          <button
            type="button"
            onClick={onBack}
            className={`shrink-0 cursor-pointer ${headerTextColor}`}
            aria-label="Назад"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>

          {/* H2: font-poster 21/600 КАПС */}
          <h2
            className={[
              'truncate font-poster text-[21px] font-semibold uppercase tracking-[0.04em]',
              headerTextColor,
            ].join(' ')}
          >
            {gardenName}
          </h2>
        </div>
      </header>

      {/* ═══ Канва (§3.1, §3.2) ═══ */}
      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden">
        {canvasSize.width > 0 && canvasSize.height > 0 && (
          <Stage width={canvasSize.width} height={canvasSize.height}>
            <Layer listening={false}>
              {/* Фон за рамкой: #EFE5C9 */}
              <Rect
                x={0}
                y={0}
                width={canvasSize.width}
                height={canvasSize.height}
                fill={BG_OUTSIDE_SHEET}
              />

              {/* Лист — бумага */}
              <Rect
                x={offsetX}
                y={offsetY}
                width={plotWPx}
                height={plotHPx}
                fill={canvasColors.paper}
              />

              {/* Клетка-миллиметровка 1м (gridPattern) */}
              {patternImages.grid && (
                <Rect
                  x={offsetX}
                  y={offsetY}
                  width={plotWPx}
                  height={plotHPx}
                  fillPatternImage={patternImages.grid}
                  fillPatternScale={{ x: scale / 20, y: scale / 20 }}
                />
              )}

              {/* Клетка-миллиметровка 5м (gridPattern5) */}
              {patternImages.grid5 && (
                <Rect
                  x={offsetX}
                  y={offsetY}
                  width={plotWPx}
                  height={plotHPx}
                  fillPatternImage={patternImages.grid5}
                  fillPatternScale={{ x: scale / 20, y: scale / 20 }}
                />
              )}

              {/* Рамка внешняя ink 3px */}
              <Rect
                x={offsetX}
                y={offsetY}
                width={plotWPx}
                height={plotHPx}
                stroke={canvasColors.ink}
                strokeWidth={3}
              />

              {/* Рамка внутренняя ink 1px (отступ 5px) */}
              <Rect
                x={offsetX + SHEET_INSET}
                y={offsetY + SHEET_INSET}
                width={Math.max(0, plotWPx - SHEET_INSET * 2)}
                height={Math.max(0, plotHPx - SHEET_INSET * 2)}
                stroke={canvasColors.ink}
                strokeWidth={1}
              />

              {/* Объекты схемы (§3.2) */}
              {mockObjects.map((obj) => (
                <ObjectShape
                  key={obj.id}
                  obj={obj}
                  scale={scale}
                  mx={mx}
                  my={my}
                  patternImages={patternImages}
                  selected={isObjectSelected(obj)}
                />
              ))}

              {/* Номера объектов поверх (§3.4) */}
              <ObjectNumbers
                objects={objectsForNumbers}
                groupMap={groupMap}
                selectedNumber={selectedNumber}
              />

              {/* Атрибуты генплана: штамп / север / линейка (§3.4) */}
              <GenplanAttributes
                canvasWidth={canvasSize.width}
                canvasHeight={canvasSize.height}
                scale={scale}
                visible={showAttributes}
              />
            </Layer>
          </Stage>
        )}
      </div>

      {/* ═══ Экспликация (§6, §3.4) ═══ */}
      <Explication
        items={items}
        onSelect={(n) => setSelectedNumber(n)}
        className="shrink-0"
      />
    </div>
  );
}

// ─── Рендер одного объекта схемы (§3.2) ──────────────────────────────

interface ObjectShapeProps {
  obj: SchemaObjectData;
  scale: number;
  mx: (m: number) => number;
  my: (m: number) => number;
  patternImages: Record<string, HTMLImageElement>;
  selected: boolean;
}

function ObjectShape({ obj, scale, mx, my, patternImages, selected }: ObjectShapeProps) {
  const geom = obj.geometry;
  const isPointType = obj.type === 'tree' || obj.type === 'shrub' || obj.type === 'gate';

  // ─── Point-объекты: дерево / кустарник / калитка ──────────────────
  if (geom.type === 'point' || isPointType) {
    const [gx, gy] = geom.points[0];
    const px = mx(gx);
    const py = my(gy);

    // Калитка — Konva Circle gateFill
    if (obj.type === 'gate') {
      const rPx = pointRadiusM('gate') * scale;
      return (
        <Group>
          <Circle
            x={px}
            y={py}
            radius={rPx}
            fill={canvasColors.gateFill}
            stroke={canvasColors.ink}
            strokeWidth={2}
          />
          {selected && (
            <Circle
              x={px}
              y={py}
              radius={rPx + 3}
              stroke={canvasColors.red}
              strokeWidth={4}
            />
          )}
        </Group>
      );
    }

    // Дерево / кустарник — Konva Shape с зубчатой кроной
    const rPx = pointRadiusM(obj.type) * scale;
    const drawCrown = obj.type === 'tree' ? drawTreeCrown : drawShrubCrown;

    return (
      <Group>
        <Shape
          x={px - rPx}
          y={py - rPx}
          sceneFunc={(ctx: Konva.Context, shape: Konva.Shape) => {
            drawCrown(
              ctx as unknown as CanvasRenderingContext2D,
              shape,
              rPx,
            );
          }}
        />
        {selected && (
          <Circle
            x={px}
            y={py}
            radius={rPx + 4}
            stroke={canvasColors.red}
            strokeWidth={4}
          />
        )}
      </Group>
    );
  }

  // ─── Polygon-объекты ──────────────────────────────────────────────
  const style = typeStyle[obj.type] ?? { fill: canvasColors.surface, pattern: null as PatternKind };
  const flatPoints = geom.points.flatMap(([x, y]) => [mx(x), my(y)]);

  // Bounding box для function-паттернов
  const xs = geom.points.map((p) => mx(p[0]));
  const ys = geom.points.map((p) => my(p[1]));
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX;
  const h = Math.max(...ys) - minY;

  return (
    <Group>
      {/* Базовая заливка + контур ink 2.5px */}
      <Line
        points={flatPoints}
        closed
        fill={style.fill}
        stroke={canvasColors.ink}
        strokeWidth={2.5}
      />

      {/* Паттерн-фактура */}
      {style.pattern === 'image' &&
        style.patternKey &&
        patternImages[style.patternKey] && (
          <Line
            points={flatPoints}
            closed
            fillPatternImage={patternImages[style.patternKey]}
            fillPatternScale={{ x: scale / 20, y: scale / 20 }}
          />
        )}

      {style.pattern === 'bed' && (
        <Shape
          sceneFunc={(ctx: Konva.Context) => {
            const c = ctx as unknown as CanvasRenderingContext2D;
            c.save();
            c.beginPath();
            geom.points.forEach(([x, y], i) => {
              const ppx = mx(x);
              const ppy = my(y);
              if (i === 0) c.moveTo(ppx, ppy);
              else c.lineTo(ppx, ppy);
            });
            c.closePath();
            c.clip();
            drawBedPattern(c, minX, minY, w, h);
            c.restore();
          }}
        />
      )}

      {style.pattern === 'water' && (
        <Shape
          sceneFunc={(ctx: Konva.Context) => {
            const c = ctx as unknown as CanvasRenderingContext2D;
            c.save();
            c.beginPath();
            geom.points.forEach(([x, y], i) => {
              const ppx = mx(x);
              const ppy = my(y);
              if (i === 0) c.moveTo(ppx, ppy);
              else c.lineTo(ppx, ppy);
            });
            c.closePath();
            c.clip();
            drawWaterPattern(c, minX, minY, w, h);
            c.restore();
          }}
        />
      )}

      {/* Выделение: красная рамка red 4px поверх */}
      {selected && (
        <Line
          points={flatPoints}
          closed
          stroke={canvasColors.red}
          strokeWidth={4}
        />
      )}
    </Group>
  );
}

export default GardenDetail;
