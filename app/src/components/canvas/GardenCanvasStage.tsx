/**
 * GardenCanvasStage — сама Konva-канва участка (Stage + Layer), вынесена
 * из GardenDetail в отдельный чанк для ленивой загрузки (задача 17.3):
 * react-konva/konva (~357KB) грузится только когда экран участка реально
 * показывает канву, не блокируя первую отрисовку остального экрана.
 */

import { forwardRef } from 'react';
import { Stage, Layer, Rect, Line, Circle, Shape, Group } from 'react-konva';
import type Konva from 'konva';
import { canvasColors } from '../../theme/canvasColors';
import { drawBedPattern, drawWaterPattern, drawTreeCrown, drawShrubCrown } from '../../theme/canvasPatterns';
import { ObjectNumbers } from './ObjectNumbers';
import type { SchemaObjectForNumber } from './ObjectNumbers';
import type { SchemaObjectData } from './useExplicationData';
import { GenplanAttributes } from './GenplanAttributes';
import type { EditorMode } from './EditorToolbar';
import { PlantingMarkers } from './PlantingMarkers';
import type { PlantingMarkerData } from './PlantingMarkers';
import { CachedZonesLayer as ZonesLayer } from './ZonesLayer';
import type { ZoneLayerKind } from './zoneConditions';
import type { StagePanZoomProps } from './usePanZoom';
import type { DrawGeometryKind } from './useDrawObject';

/** Фон за рамкой листа (DESIGN.md §3.1) */
const BG_OUTSIDE_SHEET = '#EFE5C9';
/** Отступ внутренней рамки от внешней (§3.1) */
const SHEET_INSET = 5;

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

export interface DraftDrawState {
  draftPoints: number[][];
  handleStageTap: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
}

export interface GardenCanvasStageProps {
  canvasWidth: number;
  canvasHeight: number;
  stageProps: StagePanZoomProps;
  editorMode: EditorMode;
  draw: DraftDrawState;
  drawZone: DraftDrawState;
  drawKind: DrawGeometryKind;
  handleStageClick: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => void;
  patternImages: Record<string, HTMLImageElement>;
  offsetX: number;
  offsetY: number;
  plotWPx: number;
  plotHPx: number;
  scale: number;
  objects: SchemaObjectData[];
  mx: (m: number) => number;
  my: (m: number) => number;
  isObjectSelected: (obj: SchemaObjectData) => boolean;
  selectedObjectId: string | null;
  onSelectObject: (id: string) => void;
  handleObjectMove: (obj: SchemaObjectData, dxM: number, dyM: number) => void;
  zoneLayer: ZoneLayerKind | null;
  visibleZones: { id: string; condition: string; geometry: { points: number[][] } }[];
  deleteZoneId: string | null;
  /** Тап по зоне: активен только в режиме зон, пока не выбран condition (иначе тап рисует) */
  onZoneTap: ((id: string) => void) | undefined;
  objectsForNumbers: SchemaObjectForNumber[];
  groupMap: Map<string, number>;
  selectedNumber: number | null;
  activePlantings: PlantingMarkerData[];
  onPlantingMarkerTap: (objectId: string) => void;
  showAttributes: boolean;
}

const GardenCanvasStage = forwardRef<Konva.Stage, GardenCanvasStageProps>(function GardenCanvasStage({
  canvasWidth,
  canvasHeight,
  stageProps,
  editorMode,
  draw,
  drawZone,
  drawKind,
  handleStageClick,
  patternImages,
  offsetX,
  offsetY,
  plotWPx,
  plotHPx,
  scale,
  objects,
  mx,
  my,
  isObjectSelected,
  selectedObjectId,
  onSelectObject,
  handleObjectMove,
  zoneLayer,
  visibleZones,
  deleteZoneId,
  onZoneTap,
  objectsForNumbers,
  groupMap,
  selectedNumber,
  activePlantings,
  onPlantingMarkerTap,
  showAttributes,
}, ref) {
  return (
    <Stage
      ref={ref}
      width={canvasWidth}
      height={canvasHeight}
      {...stageProps}
      onMouseDown={
        editorMode === 'addObject'
          ? draw.handleStageTap
          : editorMode === 'zones'
            ? drawZone.handleStageTap
            : undefined
      }
      onTouchStart={
        editorMode === 'addObject'
          ? draw.handleStageTap
          : editorMode === 'zones'
            ? drawZone.handleStageTap
            : undefined
      }
      onClick={handleStageClick}
      onTap={handleStageClick}
    >
      <Layer>
        {/* Фон за рамкой: #EFE5C9 */}
        <Rect
          listening={false}
          x={0}
          y={0}
          width={canvasWidth}
          height={canvasHeight}
          fill={BG_OUTSIDE_SHEET}
        />

        {/* Лист — бумага */}
        <Rect
          listening={false}
          x={offsetX}
          y={offsetY}
          width={plotWPx}
          height={plotHPx}
          fill={canvasColors.paper}
        />

        {/* Клетка-миллиметровка 1м (gridPattern) */}
        {patternImages.grid && (
          <Rect
            listening={false}
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
            listening={false}
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
          listening={false}
          x={offsetX}
          y={offsetY}
          width={plotWPx}
          height={plotHPx}
          stroke={canvasColors.ink}
          strokeWidth={3}
        />

        {/* Рамка внутренняя ink 1px (отступ 5px) */}
        <Rect
          listening={false}
          x={offsetX + SHEET_INSET}
          y={offsetY + SHEET_INSET}
          width={Math.max(0, plotWPx - SHEET_INSET * 2)}
          height={Math.max(0, plotHPx - SHEET_INSET * 2)}
          stroke={canvasColors.ink}
          strokeWidth={1}
        />

        {/* Объекты схемы (§3.2) */}
        {objects.map((obj) => (
          <ObjectShape
            key={obj.id}
            obj={obj}
            scale={scale}
            mx={mx}
            my={my}
            patternImages={patternImages}
            selected={isObjectSelected(obj)}
            interactive={editorMode === 'view'}
            individuallySelected={selectedObjectId === obj.id}
            onSelect={() => onSelectObject(obj.id)}
            onMove={(dxM, dyM) => handleObjectMove(obj, dxM, dyM)}
          />
        ))}

        {/* Зоны условий (задача 3.6) — один слой одновременно */}
        {zoneLayer && (
          <ZonesLayer
            zones={visibleZones}
            mx={mx}
            my={my}
            onZoneTap={onZoneTap}
            selectedZoneId={deleteZoneId}
          />
        )}

        {/* Номера объектов поверх (§3.4) */}
        <Group listening={false}>
          <ObjectNumbers
            objects={objectsForNumbers}
            groupMap={groupMap}
            selectedNumber={selectedNumber}
          />
        </Group>

        {/* Маркеры активных посадок (задача 4.3) */}
        <PlantingMarkers
          objects={objects}
          plantings={activePlantings}
          mx={mx}
          my={my}
          onTap={onPlantingMarkerTap}
        />

        {/* Атрибуты генплана: штамп / север / линейка (§3.4) */}
        <GenplanAttributes
          canvasWidth={canvasWidth}
          canvasHeight={canvasHeight}
          scale={scale}
          visible={showAttributes}
        />

        {/* Черновик рисуемой зоны (задача 3.7) */}
        {drawZone.draftPoints.length > 0 && (
          <Group>
            <Line
              points={drawZone.draftPoints.flatMap(([x, y]) => [mx(x), my(y)])}
              stroke={canvasColors.blueInk}
              strokeWidth={2}
              dash={[6, 4]}
              closed={drawZone.draftPoints.length >= 3}
            />
            {drawZone.draftPoints.map(([x, y], i) => (
              <Circle
                key={i}
                x={mx(x)}
                y={my(y)}
                radius={i === 0 ? 6 : 4}
                fill={i === 0 ? canvasColors.paper : canvasColors.blueInk}
                stroke={canvasColors.blueInk}
                strokeWidth={2}
              />
            ))}
          </Group>
        )}

        {/* Черновик рисуемого объекта (задача 3.3) */}
        {draw.draftPoints.length > 0 && (
          <Group>
            <Line
              points={draw.draftPoints.flatMap(([x, y]) => [mx(x), my(y)])}
              stroke={canvasColors.red}
              strokeWidth={2}
              dash={[6, 4]}
              closed={drawKind === 'polygon' && draw.draftPoints.length >= 3}
            />
            {draw.draftPoints.map(([x, y], i) => (
              <Circle
                key={i}
                x={mx(x)}
                y={my(y)}
                radius={i === 0 ? 6 : 4}
                fill={i === 0 ? canvasColors.paper : canvasColors.red}
                stroke={canvasColors.red}
                strokeWidth={2}
              />
            ))}
          </Group>
        )}
      </Layer>
    </Stage>
  );
});

export default GardenCanvasStage;

// ─── Рендер одного объекта схемы (§3.2, выделение/drag — задача 3.4) ──

interface ObjectShapeProps {
  obj: SchemaObjectData;
  scale: number;
  mx: (m: number) => number;
  my: (m: number) => number;
  patternImages: Record<string, HTMLImageElement>;
  selected: boolean;
  interactive: boolean;
  individuallySelected: boolean;
  onSelect: () => void;
  onMove: (dxM: number, dyM: number) => void;
}

function ObjectShape({
  obj,
  scale,
  mx,
  my,
  patternImages,
  selected,
  interactive,
  individuallySelected,
  onSelect,
  onMove
}: ObjectShapeProps) {
  const geom = obj.geometry;
  const isPointType = obj.type === 'tree' || obj.type === 'shrub' || obj.type === 'gate';

  // Обработчик тапа/клика
  const handleSelect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (!interactive) return;
    e.cancelBubble = true; // Не передаем клик на Stage
    onSelect();
  };

  // Обработчик завершения перетаскивания
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const dxM = e.target.x() / scale; // Пиксели в метры
    const dyM = e.target.y() / scale;
    onMove(dxM, dyM);
    e.target.position({ x: 0, y: 0 }); // Сброс позиции: React пересчитает геометрию
  };

  // Общие пропсы для интерактивной группы
  const groupProps = {
    onClick: handleSelect,
    onTap: handleSelect,
    draggable: interactive && individuallySelected,
    onDragEnd: handleDragEnd,
  };

  const isHighlighted = selected || individuallySelected;

  // ─── Point-объекты: дерево / кустарник / калитка ──────────────────
  if (geom.type === 'point' || isPointType) {
    const [gx, gy] = geom.points[0];
    const px = mx(gx);
    const py = my(gy);

    // Калитка — Konva Circle gateFill
    if (obj.type === 'gate') {
      const rPx = pointRadiusM('gate') * scale;
      return (
        <Group {...groupProps}>
          <Circle
            x={px}
            y={py}
            radius={rPx}
            fill={canvasColors.gateFill}
            stroke={canvasColors.ink}
            strokeWidth={2}
          />
          {isHighlighted && (
            <Circle
              x={px}
              y={py}
              radius={rPx + 3}
              stroke={canvasColors.red}
              strokeWidth={4}
              listening={false} // Декоративная рамка не ловит хит
            />
          )}
        </Group>
      );
    }

    // Дерево / кустарник — Konva Shape с зубчатой кроной
    const rPx = pointRadiusM(obj.type) * scale;
    const drawCrown = obj.type === 'tree' ? drawTreeCrown : drawShrubCrown;

    return (
      <Group {...groupProps}>
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
        {isHighlighted && (
          <Circle
            x={px}
            y={py}
            radius={rPx + 4}
            stroke={canvasColors.red}
            strokeWidth={4}
            listening={false} // Декоративная рамка не ловит хит
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
    <Group {...groupProps}>
      {/* Базовая заливка + контур ink 2.5px (ловит хиты) */}
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
            listening={false} // Декор не ловит хиты
          />
        )}

      {style.pattern === 'bed' && (
        <Shape
          listening={false} // Декор не ловит хиты
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
          listening={false} // Декор не ловит хиты
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
      {isHighlighted && (
        <Line
          points={flatPoints}
          closed
          stroke={canvasColors.red}
          strokeWidth={4}
          listening={false} // Декор не ловит хиты
        />
      )}
    </Group>
  );
}
