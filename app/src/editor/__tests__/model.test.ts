/**
 * Тесты модели: сериализация формы в geometry PocketBase (points всегда
 * пересчитаны из shape), импорт легаси-записей, переключение форм.
 */

import { describe, it, expect } from 'vitest';
import {
  objectGeometry,
  zoneGeometry,
  parseStoredShape,
  objectFromRecord,
  zoneFromRecord,
  toggleRectCircle,
  extendLine,
  type EditorObject,
  type EditorZone,
} from '../model';
import type { SchemaObject, LightZone } from '../../lib/pb';

const houseObj: EditorObject = {
  id: 'o1',
  kind: 'object',
  type: 'building',
  label: 'Дом',
  shape: { kind: 'rect', cx: 10, cy: 8, w: 6, h: 4, rot: 0 },
};

describe('сериализация', () => {
  it('дом → polygon c 4 углами + shape', () => {
    const g = objectGeometry(houseObj);
    expect(g.type).toBe('polygon');
    expect(g.points).toEqual([
      [7, 6],
      [13, 6],
      [13, 10],
      [7, 10],
    ]);
    expect(g.shape).toEqual({ kind: 'rect', cx: 10, cy: 8, w: 6, h: 4, rot: 0 });
  });

  it('дерево → point (совместимость со старым просмотром)', () => {
    const tree: EditorObject = {
      id: 'o2',
      kind: 'object',
      type: 'tree',
      shape: { kind: 'circle', cx: 4, cy: 5, r: 1.5 },
    };
    const g = objectGeometry(tree);
    expect(g.type).toBe('point');
    expect(g.points).toEqual([[4, 5]]);
    expect(g.shape).toEqual({ kind: 'circle', cx: 4, cy: 5, r: 1.5 });
  });

  it('зона → points из формы + shape', () => {
    const zone: EditorZone = {
      id: 'z1',
      kind: 'zone',
      condition: 'sunny',
      shape: { kind: 'rect', cx: 2, cy: 2, w: 4, h: 4, rot: 0 },
    };
    const g = zoneGeometry(zone);
    expect(g.points).toHaveLength(4);
    expect(g.shape.kind).toBe('rect');
  });
});

describe('parseStoredShape', () => {
  it('валидные формы восстанавливаются', () => {
    expect(parseStoredShape({ kind: 'rect', cx: 1, cy: 2, w: 3, h: 4, rot: 15 })).toEqual({
      kind: 'rect', cx: 1, cy: 2, w: 3, h: 4, rot: 15,
    });
    expect(parseStoredShape({ kind: 'circle', cx: 1, cy: 2, r: 3 })).toEqual({
      kind: 'circle', cx: 1, cy: 2, r: 3,
    });
    expect(parseStoredShape({ kind: 'line', pts: [[0, 0], [1, 1]], width: 1 })).toEqual({
      kind: 'line', pts: [[0, 0], [1, 1]], width: 1,
    });
  });

  it('мусор отвергается', () => {
    expect(parseStoredShape(null)).toBeNull();
    expect(parseStoredShape({ kind: 'rect', cx: 1 })).toBeNull();
    expect(parseStoredShape({ kind: 'rect', cx: 1, cy: 2, w: -3, h: 4 })).toBeNull();
    expect(parseStoredShape({ kind: 'circle', cx: 1, cy: 2, r: 0 })).toBeNull();
    expect(parseStoredShape({ kind: 'line', pts: [], width: 1 })).toBeNull();
    expect(parseStoredShape({ kind: 'weird' })).toBeNull();
  });
});

function rec(data: Partial<SchemaObject>): SchemaObject {
  return { id: 'r1', collectionId: '', collectionName: '', ...data } as SchemaObject;
}

describe('импорт записей', () => {
  it('запись с shape читается как есть', () => {
    const o = objectFromRecord(
      rec({
        type: 'building',
        geometry: {
          type: 'polygon',
          points: [[0, 0]],
          shape: { kind: 'rect', cx: 5, cy: 5, w: 6, h: 4, rot: 30 },
        } as never,
      }),
    );
    expect(o?.shape).toEqual({ kind: 'rect', cx: 5, cy: 5, w: 6, h: 4, rot: 30 });
  });

  it('легаси-точка дерева → круг с радиусом кроны просмотра', () => {
    const o = objectFromRecord(
      rec({ type: 'tree', geometry: { type: 'point', points: [[3, 4]] } }),
    );
    expect(o?.shape).toEqual({ kind: 'circle', cx: 3, cy: 4, r: 2.5 });
  });

  it('легаси-полигон-прямоугольник → полноценный rect', () => {
    const o = objectFromRecord(
      rec({
        type: 'building',
        geometry: { type: 'polygon', points: [[2, 2], [8, 2], [8, 6], [2, 6]] },
      }),
    );
    expect(o?.shape).toEqual({ kind: 'rect', cx: 5, cy: 4, w: 6, h: 4, rot: 0 });
  });

  it('произвольный легаси-полигон → poly (перенос/удаление)', () => {
    const o = objectFromRecord(
      rec({
        type: 'lawn',
        geometry: { type: 'polygon', points: [[0, 0], [6, 1], [5, 6], [0, 4]] },
      }),
    );
    expect(o?.shape.kind).toBe('poly');
  });

  it('битая запись без points → null', () => {
    expect(objectFromRecord(rec({ type: 'lawn', geometry: {} as never }))).toBeNull();
  });

  it('зона из легаси-points', () => {
    const z = zoneFromRecord({
      id: 'z1', collectionId: '', collectionName: '',
      gardenId: 'g', condition: 'shade',
      geometry: { points: [[0, 0], [4, 0], [4, 4], [0, 4]] },
    } as LightZone);
    expect(z?.condition).toBe('shade');
    expect(z?.shape).toEqual({ kind: 'rect', cx: 2, cy: 2, w: 4, h: 4, rot: 0 });
  });
});

describe('преобразования форм', () => {
  it('прямоугольник ⇄ круг сохраняет центр', () => {
    const c = toggleRectCircle({ kind: 'rect', cx: 3, cy: 4, w: 2, h: 2, rot: 0 });
    expect(c).toEqual({ kind: 'circle', cx: 3, cy: 4, r: 1 });
    const r = toggleRectCircle(c);
    expect(r).toEqual({ kind: 'rect', cx: 3, cy: 4, w: 2, h: 2, rot: 0 });
  });

  it('extendLine добавляет видимую вершину (поворот от направления)', () => {
    const l = extendLine({ kind: 'line', pts: [[0, 0], [4, 0]], width: 1 }, 2);
    expect(l.pts).toHaveLength(3);
    const [x, y] = l.pts[2];
    expect(Math.hypot(x - 4, y - 0)).toBeCloseTo(2, 5);
  });
});
