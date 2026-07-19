/**
 * PlantingMarkers — значки активных посадок на объектах схемы (задача 4.3).
 * Кружок-бирка с числом посадок у верхнего края объекта; тап — открыть
 * список посадок этого места.
 */

import { useMemo } from 'react';
import { memo } from 'react';
import { Circle, Group, Text } from 'react-konva';
import { canvasColors } from '../../theme/canvasColors';
import type { SchemaObjectData } from './useExplicationData';

export interface PlantingMarkerData {
  _id: string;
  schemaObjectId?: string;
}

interface PlantingMarkersProps {
  objects: SchemaObjectData[];
  plantings: PlantingMarkerData[];
  mx: (m: number) => number;
  my: (m: number) => number;
  /** Тап по маркеру: id объекта схемы */
  onTap: (schemaObjectId: string) => void;
}

const MARKER_RADIUS = 13;


interface MarkerViewProps {
  id: string;
  x: number;
  y: number;
  count: number;
  onTap: (id: string) => void;
}

const MarkerView = memo(function MarkerView({ id, x, y, count, onTap }: MarkerViewProps) {
  return (
    <Group
      onClick={(e) => {
        e.cancelBubble = true;
        onTap(id);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onTap(id);
      }}
    >
      <Circle
        x={x}
        y={y}
        radius={MARKER_RADIUS}
        fill={canvasColors.green}
        stroke={canvasColors.ink}
        strokeWidth={2}
      />
      <Text
        x={x - MARKER_RADIUS}
        y={y - MARKER_RADIUS}
        width={MARKER_RADIUS * 2}
        height={MARKER_RADIUS * 2}
        text={String(count)}
        align="center"
        verticalAlign="middle"
        fontFamily="'PT Mono', monospace"
        fontStyle="bold"
        fontSize={13}
        fill={canvasColors.paper}
        listening={false}
      />
    </Group>
  );
}, (prev, next) => {
  return prev.id === next.id && prev.x === next.x && prev.y === next.y && prev.count === next.count;
});


export function PlantingMarkers({
  objects,
  plantings,
  mx,
  my,
  onTap,
}: PlantingMarkersProps) {
  // Число активных посадок на объект
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of plantings) {
      if (!p.schemaObjectId) continue;
      map.set(p.schemaObjectId, (map.get(p.schemaObjectId) ?? 0) + 1);
    }
    return map;
  }, [plantings]);

  return (
    <Group>
      {objects.map((obj) => {
        const count = counts.get(obj.id);
        if (!count) return null;

        const xs = obj.geometry.points.map((p) => mx(p[0]));
        const ys = obj.geometry.points.map((p) => my(p[1]));
        const x = Math.max(...xs);
        const y = Math.min(...ys);

        return (
          <MarkerView
            key={obj.id}
            id={obj.id}
            x={x}
            y={y}
            count={count}
            onTap={onTap}
          />
        );
      })}
    </Group>
  );
}
