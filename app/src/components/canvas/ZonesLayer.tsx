/**
 * ZonesLayer — рендер зон условий (свет/влага) на канве (задача 3.6).
 * DESIGN §3.3: полупрозрачная заливка + пунктирная граница 2px + штриховка
 * для «тени» и «влажно», точечный пунктир для «сухо».
 * Одновременно виден один слой.
 */

import { memo, useEffect, useRef } from 'react';
import { Group, Layer, Line, Shape } from 'react-konva';
import type Konva from 'konva';
export type { ZoneLayerKind } from './zoneConditions';
export { ZONE_CONDITIONS, zoneConditionLabel } from './zoneConditions';

export interface ZoneData {
  id: string;
  condition: string;
  geometry: { points: number[][] };
}

interface ZoneStyle {
  fill: string;
  stroke: string;
  /** Штриховка диагональными линиями */
  hatch?: boolean;
  /** Точечный пунктир вместо обычного */
  dotted?: boolean;
}

/** Таблица стилей §3.3 DESIGN */
const ZONE_STYLES: Record<string, ZoneStyle> = {
  // Свет
  sunny: { fill: 'rgba(255,214,74,.14)', stroke: 'rgba(214,166,26,.85)' },
  partial_shade: { fill: 'rgba(90,105,120,.24)', stroke: 'rgba(90,105,120,.85)' },
  shade: { fill: 'rgba(42,56,70,.42)', stroke: 'rgba(42,56,70,.9)', hatch: true },
  // Влага
  dry: { fill: 'rgba(217,164,74,.22)', stroke: 'rgba(191,138,48,.85)', dotted: true },
  moderate: { fill: 'rgba(95,168,211,.18)', stroke: 'rgba(95,168,211,.85)' },
  wet: { fill: 'rgba(46,111,163,.34)', stroke: 'rgba(46,111,163,.9)', hatch: true },
};

const FALLBACK_STYLE: ZoneStyle = {
  fill: 'rgba(90,105,120,.18)',
  stroke: 'rgba(90,105,120,.85)',
};

interface ZonesLayerProps {
  zones: ZoneData[];
  mx: (m: number) => number;
  my: (m: number) => number;
  /** Тап по зоне (для удаления в режиме зон); undefined — зоны не ловят хиты */
  onZoneTap?: (zoneId: string) => void;
  /** Выделенная зона — жирная граница */
  selectedZoneId?: string | null;
}

/** Диагональная штриховка внутри полигона */
function hatchSceneFunc(
  pointsPx: number[][],
  stroke: string,
): (ctx: Konva.Context) => void {
  return (ctx) => {
    const c = ctx as unknown as CanvasRenderingContext2D;
    const xs = pointsPx.map((p) => p[0]);
    const ys = pointsPx.map((p) => p[1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    c.save();
    c.beginPath();
    pointsPx.forEach(([x, y], i) => {
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    });
    c.closePath();
    c.clip();

    c.strokeStyle = stroke;
    c.lineWidth = 1;
    const step = 8;
    const span = maxY - minY + (maxX - minX);
    for (let d = 0; d <= span; d += step) {
      c.beginPath();
      c.moveTo(minX, minY + d);
      c.lineTo(minX + d, minY);
      c.stroke();
    }
    c.restore();
  };
}


/** Один полигон зоны — обёрнут в memo чтобы не перерисовываться при изменении других зон */
interface ZoneItemProps {
  zoneId: string;
  condition: string;
  pointsPx: number[][];
  selected: boolean;
  onZoneTap?: (zoneId: string) => void;
}

const ZoneItem = memo(function ZoneItem({ zoneId, condition, pointsPx, selected, onZoneTap }: ZoneItemProps) {
  const style = ZONE_STYLES[condition] ?? FALLBACK_STYLE;
  const flat = pointsPx.flat();
  return (
    <Group>
      <Line
        points={flat}
        closed
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={selected ? 4 : 2}
        dash={style.dotted ? [2, 5] : [8, 6]}
        listening={onZoneTap !== undefined}
        onClick={
          onZoneTap
            ? (e) => {
                e.cancelBubble = true;
                onZoneTap(zoneId);
              }
            : undefined
        }
        onTap={
          onZoneTap
            ? (e) => {
                e.cancelBubble = true;
                onZoneTap(zoneId);
              }
            : undefined
        }
      />
      {style.hatch && (
        <Shape listening={false} sceneFunc={hatchSceneFunc(pointsPx, style.stroke)} />
      )}
    </Group>
  );
}, (prev, next) => {
  // Custom areEqual: перерисовываем только если изменились зона или выделение
  return (
    prev.zoneId === next.zoneId &&
    prev.condition === next.condition &&
    prev.selected === next.selected &&
    prev.onZoneTap === next.onZoneTap &&
    prev.pointsPx === next.pointsPx
  );
});



/**
 * CachedZonesLayer — ZonesLayer с Konva cache (задача 22.3).
 *
 * Konva не поддерживает OffscreenCanvas напрямую, но Layer.cache()
 * рендерит содержимое в off-screen canvas bitmap — тот же эффект
 * для статичных слоёв (зоны не меняются часто).
 *
 * Cache обновляется только при изменении zones/selectedZoneId.
 * В режиме редактирования зон (onZoneTap активен) cache отключён —
 * нужны интерактивные хит-тесты.
 */
interface CachedZonesLayerProps extends ZonesLayerProps {}

export function CachedZonesLayer(props: CachedZonesLayerProps) {
  const layerRef = useRef<Konva.Layer>(null);

  // Cache when zones are static (not in editing mode)
  const isStatic = props.onZoneTap === undefined;

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || !isStatic) return;

    // Clear previous cache, then re-cache after render
    layer.clearCache();
    const id = requestAnimationFrame(() => {
      layer.cache();
    });
    return () => cancelAnimationFrame(id);
  }, [props.zones, props.selectedZoneId, isStatic]);

  // Also need types import for Konva.Layer ref
  return (
    <Layer ref={layerRef} listening={!isStatic}>
      <ZonesLayer {...props} />
    </Layer>
  );
}


export function ZonesLayer({ zones, mx, my, onZoneTap, selectedZoneId }: ZonesLayerProps) {
  return (
    <Group>
      {zones.map((zone) => {
        const pointsPx = zone.geometry.points.map(([x, y]) => [mx(x), my(y)]);
        const selected = selectedZoneId === zone.id;
        return (
          <ZoneItem
            key={zone.id}
            zoneId={zone.id}
            condition={zone.condition}
            pointsPx={pointsPx}
            selected={selected}
            onZoneTap={onZoneTap}
          />
        );
      })}
    </Group>
  );
}
