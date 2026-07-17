/**
 * ObjectNumbers — DESIGN.md v5.1 §3.4
 *
 * Номера объектов генплана: кружки ⌀20 paper с рамкой ink 1.5px,
 * номер PT Mono 11/700.
 *
 * Группировка: объекты с одинаковыми (type + label) получают один общий
 * номер. Объекты без label — каждый со своим номером.
 *
 * Позиция номера: центроид всех точек группы.
 *   - point-объекты (tree, shrub, gate) → одна координата на объект;
 *   - polygon/line → все вершины.
 *
 * Выделение (props.selectedNumber): красное кольцо red 4px поверх номера.
 *
 * Рендерится поверх всех объектов схемы (родитель размещает компонент
 * последним в дереве Konva).
 */

import { Group, Circle, Text } from 'react-konva';
import { canvasColors } from '../../theme/canvasColors';

// ─── Типы ───────────────────────────────────────────────────────────

export interface SchemaObjectForNumber {
  id: string;
  /** building | greenhouse | lawn | path | bed | flowerbed | tree | shrub | water | gate | other */
  type: string;
  /** Название объекта — для группировки одинаковых */
  label?: string;
  geometry: { type: string; points: number[][] };
}

export interface ObjectNumbersProps {
  objects: SchemaObjectForNumber[];
  /** Номер выбранной группы (из экспликации) — подсвечивается кольцом */
  selectedNumber?: number | null;
}

// ─── Константы (§3.4) ───────────────────────────────────────────────

/** Радиус кружка номера (⌀20 → r=10) */
const NUMBER_RADIUS = 10;
/** Толщина рамки кружка */
const NUMBER_STROKE_WIDTH = 1.5;
/** Радиус кольца выделения — чуть больше кружка */
const RING_RADIUS = 12;
/** Толщина красного кольца выделения */
const RING_STROKE_WIDTH = 4;
/** Кегль номера */
const FONT_SIZE = 11;

/** Типы-точки: номер ставится в саму точку (points[0]) */
const POINT_TYPES = new Set(['tree', 'shrub', 'gate']);

// ─── Вычисления ─────────────────────────────────────────────────────

interface NumberGroup {
  number: number;
  objects: SchemaObjectForNumber[];
  centroid: { x: number; y: number };
}

/**
 * Координаты объекта для центроида.
 *
 * Point-объекты (tree, shrub, gate или geometry.type === 'point')
 * вносят одну точку — points[0]. Остальные — все вершины.
 */
function getObjectCoords(obj: SchemaObjectForNumber): Array<[number, number]> {
  const pts = obj.geometry?.points;
  if (!pts || pts.length === 0) return [];

  const isPoint =
    obj.geometry?.type === 'point' || POINT_TYPES.has(obj.type);

  if (isPoint) {
    return [[pts[0][0], pts[0][1]]];
  }
  return pts.map(([x, y]) => [x, y] as [number, number]);
}

/**
 * Центроид группы — простое среднее всех координат всех объектов.
 */
function computeCentroid(
  objects: SchemaObjectForNumber[]
): { x: number; y: number } | null {
  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (const obj of objects) {
    for (const [x, y] of getObjectCoords(obj)) {
      sumX += x;
      sumY += y;
      count++;
    }
  }

  if (count === 0) return null;
  return { x: sumX / count, y: sumY / count };
}

/**
 * Группирует объекты по ключу (type + label).
 *
 * Объекты без label попадают в индивидуальные группы (ключ по id),
 * чтобы каждый получил собственный номер.
 *
 * Порядок групп = порядок первого появления в массиве objects.
 */
function groupObjects(objects: SchemaObjectForNumber[]): NumberGroup[] {
  const groupMap = new Map<string, SchemaObjectForNumber[]>();
  const keyOrder: string[] = [];

  for (const obj of objects) {
    const key =
      obj.label != null
        ? `${obj.type}::${obj.label}`
        : `__single__${obj.id}`;

    let arr = groupMap.get(key);
    if (!arr) {
      arr = [];
      groupMap.set(key, arr);
      keyOrder.push(key);
    }
    arr.push(obj);
  }

  const groups: NumberGroup[] = [];
  let number = 1;

  for (const key of keyOrder) {
    const objs = groupMap.get(key)!;
    const centroid = computeCentroid(objs);
    if (centroid) {
      groups.push({ number, objects: objs, centroid });
      number++;
    }
  }

  return groups;
}

// ─── Компонент ──────────────────────────────────────────────────────

export function ObjectNumbers({
  objects,
  selectedNumber = null,
}: ObjectNumbersProps) {
  const groups = groupObjects(objects);

  return (
    <Group listening={false}>
      {groups.map((group) => {
        const isSelected = selectedNumber === group.number;
        return (
          <Group key={group.number} x={group.centroid.x} y={group.centroid.y}>
            {/* Кружок номера: ⌀20 paper, рамка ink 1.5px */}
            <Circle
              radius={NUMBER_RADIUS}
              fill={canvasColors.paper}
              stroke={canvasColors.ink}
              strokeWidth={NUMBER_STROKE_WIDTH}
              perfectDrawEnabled={false}
            />

            {/* Номер: PT Mono 11/700, центрирован в кружке */}
            <Text
              text={String(group.number)}
              x={-NUMBER_RADIUS}
              y={-NUMBER_RADIUS}
              width={NUMBER_RADIUS * 2}
              height={NUMBER_RADIUS * 2}
              align="center"
              verticalAlign="middle"
              fontFamily="'PT Mono', 'JetBrains Mono', monospace"
              fontSize={FONT_SIZE}
              fontStyle="700"
              lineHeight={1}
              fill={canvasColors.ink}
            />

            {/* Кольцо выделения: red 4px, поверх номера */}
            {isSelected && (
              <Circle
                radius={RING_RADIUS}
                stroke={canvasColors.red}
                strokeWidth={RING_STROKE_WIDTH}
                perfectDrawEnabled={false}
              />
            )}
          </Group>
        );
      })}
    </Group>
  );
}

export default ObjectNumbers;
