/**
 * Модель документа редактора и (де)сериализация в PocketBase.
 *
 * Хранение обратно совместимо (EDITOR.md): в JSON-поле `geometry`
 * добавляется ключ `shape` с параметрической формой, а `points` всегда
 * пересчитываются из неё — просмотр, экспликация, печать и маркеры
 * посадок продолжают читать `points` без изменений. Миграций нет.
 */

import type { SchemaObject, LightZone, SchemaObjectType } from '../lib/pb';
import {
  type Shape,
  type RectShape,
  type CircleShape,
  type LineShape,
  shapeOutline,
  rectFromPolygon,
  round2,
} from './geometry';

// ─── Элементы документа ────────────────────────────────────────────────

export interface EditorObject {
  id: string;
  kind: 'object';
  type: SchemaObjectType;
  label?: string;
  shape: Shape;
  sortOrder?: number;
}

export type ZoneCondition = 'sunny' | 'partial_shade' | 'shade';

export interface EditorZone {
  id: string;
  kind: 'zone';
  condition: ZoneCondition;
  shape: Shape;
}

export type EditorItem = EditorObject | EditorZone;

export interface EditorDoc {
  objects: EditorObject[];
  zones: EditorZone[];
}

export const EMPTY_DOC: EditorDoc = { objects: [], zones: [] };

export function findItem(doc: EditorDoc, id: string): EditorItem | undefined {
  return (
    doc.objects.find((o) => o.id === id) ?? doc.zones.find((z) => z.id === id)
  );
}

// ─── Временные id для только что созданных элементов ───────────────────

let tempCounter = 0;

export function nextTempId(): string {
  tempCounter += 1;
  return `tmp_${tempCounter}`;
}

export function isTempId(id: string): boolean {
  return id.startsWith('tmp_');
}

// ─── Типы объектов: подписи, формы по умолчанию ────────────────────────

export interface ObjectTypeDef {
  type: SchemaObjectType;
  label: string;
  icon: string;
  /** Форма по умолчанию с центром в (0,0) — редактор сместит в центр вида */
  makeShape: () => Shape;
  /** Переключатель формы прямоугольник⇄круг в инспекторе */
  shapeSwitch?: boolean;
  /** На объект можно сажать растения */
  plantable?: boolean;
  /** Не показывать в меню «Добавить» (легаси-типы) */
  hidden?: boolean;
}

export const OBJECT_TYPE_DEFS: ObjectTypeDef[] = [
  {
    type: 'building', label: 'Дом', icon: '🏠',
    makeShape: () => ({ kind: 'rect', cx: 0, cy: 0, w: 6, h: 4, rot: 0 }),
  },
  {
    type: 'path', label: 'Дорожка', icon: '🛤️',
    makeShape: () => ({ kind: 'line', pts: [[-2, 0], [2, 0]], width: 1 }),
  },
  {
    type: 'flowerbed', label: 'Клумба', icon: '🌸', shapeSwitch: true, plantable: true,
    makeShape: () => ({ kind: 'rect', cx: 0, cy: 0, w: 2, h: 1.5, rot: 0 }),
  },
  {
    type: 'composition', label: 'Композиция', icon: '💐', shapeSwitch: true, plantable: true,
    makeShape: () => ({ kind: 'rect', cx: 0, cy: 0, w: 3, h: 2, rot: 0 }),
  },
  {
    type: 'hedge', label: 'Изгородь', icon: '🍃', plantable: true,
    makeShape: () => ({ kind: 'line', pts: [[-2, 0], [2, 0]], width: 0.5 }),
  },
  {
    type: 'tree', label: 'Дерево', icon: '🌳', plantable: true,
    makeShape: () => ({ kind: 'circle', cx: 0, cy: 0, r: 1.5 }),
  },
  {
    type: 'shrub', label: 'Куст', icon: '🌲', plantable: true,
    makeShape: () => ({ kind: 'circle', cx: 0, cy: 0, r: 0.75 }),
  },
  {
    type: 'lawn', label: 'Газон', icon: '🌿', plantable: true,
    makeShape: () => ({ kind: 'rect', cx: 0, cy: 0, w: 4, h: 3, rot: 0 }),
  },
  {
    type: 'water', label: 'Водоём', icon: '💧', shapeSwitch: true,
    makeShape: () => ({ kind: 'rect', cx: 0, cy: 0, w: 2, h: 1.5, rot: 0 }),
  },
  {
    type: 'other', label: 'Другое', icon: '📦', plantable: true,
    makeShape: () => ({ kind: 'rect', cx: 0, cy: 0, w: 2, h: 2, rot: 0 }),
  },
  {
    type: 'gate', label: 'Калитка', icon: '🚪', hidden: true,
    makeShape: () => ({ kind: 'circle', cx: 0, cy: 0, r: 0.5 }),
  },
];

export function objectTypeDef(type: string): ObjectTypeDef {
  return (
    OBJECT_TYPE_DEFS.find((d) => d.type === type) ??
    OBJECT_TYPE_DEFS.find((d) => d.type === 'other')!
  );
}

export const ZONE_CONDITION_DEFS: { condition: ZoneCondition; label: string; icon: string }[] = [
  { condition: 'sunny', label: 'Солнце', icon: '☀️' },
  { condition: 'partial_shade', label: 'Полутень', icon: '⛅' },
  { condition: 'shade', label: 'Тень', icon: '🌑' },
];

export function zoneConditionDef(condition: string) {
  return ZONE_CONDITION_DEFS.find((d) => d.condition === condition) ?? ZONE_CONDITION_DEFS[0];
}

export function makeZoneShape(): Shape {
  return { kind: 'rect', cx: 0, cy: 0, w: 4, h: 4, rot: 0 };
}

// ─── Сериализация: форма → geometry PocketBase ─────────────────────────

/** Точечные типы: старый просмотр рисует их из points[0] фиксированным радиусом. */
const POINT_TYPES = new Set(['tree', 'shrub', 'gate']);

/** Радиусы кроны в старом просмотре — для импорта легаси-точек. */
const LEGACY_POINT_RADIUS: Record<string, number> = { tree: 2.5, shrub: 1.0, gate: 0.5 };

interface StoredShape {
  kind: 'rect' | 'circle' | 'line' | 'poly';
  cx?: number;
  cy?: number;
  w?: number;
  h?: number;
  r?: number;
  rot?: number;
  pts?: number[][];
  width?: number;
}

export interface StoredGeometry {
  type: string;
  points: number[][];
  shape?: StoredShape;
}

/** geometry для записи schemaObjects: points из формы + сама форма. */
export function objectGeometry(obj: EditorObject): StoredGeometry {
  if (POINT_TYPES.has(obj.type) && obj.shape.kind === 'circle') {
    return {
      type: 'point',
      points: [[round2(obj.shape.cx), round2(obj.shape.cy)]],
      shape: storedShape(obj.shape),
    };
  }
  return {
    type: 'polygon',
    points: shapeOutline(obj.shape),
    shape: storedShape(obj.shape),
  };
}

/** geometry для записи lightZones (без ключа type — как раньше). */
export function zoneGeometry(zone: EditorZone): { points: number[][]; shape: StoredShape } {
  return { points: shapeOutline(zone.shape), shape: storedShape(zone.shape) };
}

function storedShape(s: Shape): StoredShape {
  switch (s.kind) {
    case 'rect':
      return { kind: 'rect', cx: s.cx, cy: s.cy, w: s.w, h: s.h, rot: s.rot };
    case 'circle':
      return { kind: 'circle', cx: s.cx, cy: s.cy, r: s.r };
    case 'line':
      return { kind: 'line', pts: s.pts, width: s.width };
    case 'poly':
      return { kind: 'poly', pts: s.pts };
  }
}

// ─── Десериализация: geometry PocketBase → форма ───────────────────────

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const isPts = (v: unknown): v is [number, number][] =>
  Array.isArray(v) && v.length > 0 && v.every((p) => Array.isArray(p) && isNum(p[0]) && isNum(p[1]));

/** Восстановление формы из сохранённого `shape` (с валидацией). */
export function parseStoredShape(raw: unknown): Shape | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as StoredShape;
  switch (s.kind) {
    case 'rect':
      if (isNum(s.cx) && isNum(s.cy) && isNum(s.w) && isNum(s.h) && s.w > 0 && s.h > 0) {
        return { kind: 'rect', cx: s.cx, cy: s.cy, w: s.w, h: s.h, rot: isNum(s.rot) ? s.rot : 0 };
      }
      return null;
    case 'circle':
      if (isNum(s.cx) && isNum(s.cy) && isNum(s.r) && s.r > 0) {
        return { kind: 'circle', cx: s.cx, cy: s.cy, r: s.r };
      }
      return null;
    case 'line':
      if (isPts(s.pts) && isNum(s.width) && s.width > 0) {
        return { kind: 'line', pts: s.pts, width: s.width };
      }
      return null;
    case 'poly':
      if (isPts(s.pts) && s.pts.length >= 3) return { kind: 'poly', pts: s.pts };
      return null;
    default:
      return null;
  }
}

/**
 * Импорт объекта из PocketBase. Старые записи без `shape`:
 * точечные — круг легаси-радиуса; полигоны-прямоугольники — rect;
 * прочие полигоны — свободный poly (перенос/удаление без ручек).
 */
export function objectFromRecord(rec: SchemaObject): EditorObject | null {
  const geom = rec.geometry as unknown as StoredGeometry | undefined;
  const base = {
    id: rec.id,
    kind: 'object' as const,
    type: rec.type,
    label: rec.label || undefined,
    sortOrder: rec.sortOrder,
  };

  const stored = parseStoredShape(geom?.shape);
  if (stored) return { ...base, shape: stored };

  if (!geom || !isPts(geom.points)) return null;

  if (geom.type === 'point' || POINT_TYPES.has(rec.type)) {
    const [cx, cy] = geom.points[0];
    return {
      ...base,
      shape: { kind: 'circle', cx, cy, r: LEGACY_POINT_RADIUS[rec.type] ?? 1 },
    };
  }

  if (geom.points.length < 3) return null;

  const rect = rectFromPolygon(geom.points);
  if (rect) return { ...base, shape: rect };
  return { ...base, shape: { kind: 'poly', pts: geom.points } };
}

/** Импорт зоны света из PocketBase. */
export function zoneFromRecord(rec: LightZone): EditorZone | null {
  const geom = rec.geometry as unknown as { points?: number[][]; shape?: unknown } | undefined;
  const base = { id: rec.id, kind: 'zone' as const, condition: rec.condition };

  const stored = parseStoredShape(geom?.shape);
  if (stored) return { ...base, shape: stored };

  if (!geom || !isPts(geom.points) || geom.points.length < 3) return null;
  const rect = rectFromPolygon(geom.points);
  if (rect) return { ...base, shape: rect };
  return { ...base, shape: { kind: 'poly', pts: geom.points } };
}

// ─── Преобразования формы в инспекторе ─────────────────────────────────

/** Прямоугольник ⇄ круг с сохранением центра и площади «на глаз». */
export function toggleRectCircle(shape: Shape): Shape {
  if (shape.kind === 'rect') {
    const r = round2(Math.max(0.25, (shape.w + shape.h) / 4));
    return { kind: 'circle', cx: shape.cx, cy: shape.cy, r };
  }
  if (shape.kind === 'circle') {
    const side = round2(Math.max(0.5, shape.r * 2));
    return { kind: 'rect', cx: shape.cx, cy: shape.cy, w: side, h: side, rot: 0 };
  }
  return shape;
}

/** Продолжить ломаную: новая вершина по направлению последнего сегмента. */
export function extendLine(shape: LineShape, lengthM = 2): LineShape {
  const pts = shape.pts;
  const last = pts[pts.length - 1];
  const prev = pts.length > 1 ? pts[pts.length - 2] : [last[0] - 1, last[1]];
  const dx = last[0] - prev[0];
  const dy = last[1] - prev[1];
  const len = Math.hypot(dx, dy) || 1;
  // Продолжаем с поворотом 90°, чтобы новая точка была видна и её было
  // за что взять (продолжение по прямой сливалось бы с линией).
  const nx = round2(last[0] + (-dy / len) * lengthM);
  const ny = round2(last[1] + (dx / len) * lengthM);
  return { ...shape, pts: [...pts, [nx, ny]] };
}

export type { Shape, RectShape, CircleShape, LineShape };
