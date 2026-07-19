/**
 * ObjectNumbers — DESIGN.md v5.1 §3.4
 *
 * Номера объектов генплана: кружки ⌀20 paper с рамкой ink 1.5px,
 * номер PT Mono 11/700.
 *
 * Группировка НЕ выполняется здесь — номера берутся из groupMap,
 * вычисленного хуком useExplicationData (единственный источник истины).
 * Хук использует exported-функцию groupKey для детерминированного ключа.
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

import { memo } from 'react';
import { Group, Circle, Text } from 'react-konva';
import { canvasColors } from '../../theme/canvasColors';
import { groupKey } from './useExplicationData';

// ─── Типы ───────────────────────────────────────────────────────────

export interface SchemaObjectForNumber {
  id: string;
  /** building | lawn | path | flowerbed | composition | hedge | tree | shrub | water | gate | other */
  type: string;
  /** Название объекта — для группировки одинаковых */
  label?: string;
  geometry: { type: string; points: number[][] };
}

export interface ObjectNumbersProps {
  objects: SchemaObjectForNumber[];
  /** Карта groupKey(obj) → номер (из useExplicationData). Единственный источник номеров. */
  groupMap: Map<string, number>;
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
 * Группирует объекты по номерам из groupMap и вычисляет центроид каждой группы.
 *
 * Номера берутся из useExplicationData.groupMap — этот компонент НЕ выполняет
 * собственную группировку. Только сбор точек и усреднение.
 */
function computeGroups(
  objects: SchemaObjectForNumber[],
  groupMap: Map<string, number>
): NumberGroup[] {
  // Собираем точки по номерам
  const groupsByNumber = new Map<number, { sumX: number; sumY: number; count: number }>();

  for (const obj of objects) {
    const key = groupKey(obj);
    const number = groupMap.get(key);
    if (number === undefined) continue;

    let entry = groupsByNumber.get(number);
    if (!entry) {
      entry = { sumX: 0, sumY: 0, count: 0 };
      groupsByNumber.set(number, entry);
    }

    for (const [x, y] of getObjectCoords(obj)) {
      entry.sumX += x;
      entry.sumY += y;
      entry.count++;
    }
  }

  const groups: NumberGroup[] = [];
  for (const [number, entry] of groupsByNumber) {
    if (entry.count > 0) {
      groups.push({
        number,
        centroid: { x: entry.sumX / entry.count, y: entry.sumY / entry.count },
      });
    }
  }

  return groups;
}

// ─── Компонент ──────────────────────────────────────────────────────


interface NumberGroupViewProps {
  number: number;
  x: number;
  y: number;
  selected: boolean;
}

const NumberGroupView = memo(function NumberGroupView({ number, x, y, selected }: NumberGroupViewProps) {
  return (
    <Group key={number} x={x} y={y}>
      <Circle
        radius={NUMBER_RADIUS}
        fill={canvasColors.paper}
        stroke={canvasColors.ink}
        strokeWidth={NUMBER_STROKE_WIDTH}
        perfectDrawEnabled={false}
      />
      <Text
        text={String(number)}
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
      {selected && (
        <Circle
          radius={RING_RADIUS}
          stroke={canvasColors.red}
          strokeWidth={RING_STROKE_WIDTH}
          perfectDrawEnabled={false}
        />
      )}
    </Group>
  );
}, (prev, next) => {
  return prev.number === next.number && prev.x === next.x && prev.y === next.y && prev.selected === next.selected;
});


export function ObjectNumbers({
  objects,
  groupMap,
  selectedNumber = null,
}: ObjectNumbersProps) {
  const groups = computeGroups(objects, groupMap);

  return (
    <Group listening={false}>
      {groups.map((group) => (
        <NumberGroupView
          key={group.number}
          number={group.number}
          x={group.centroid.x}
          y={group.centroid.y}
          selected={selectedNumber === group.number}
        />
      ))}
    </Group>
  );
}

export default ObjectNumbers;
