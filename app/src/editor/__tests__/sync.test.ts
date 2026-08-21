/**
 * Тесты автосохранения: диф документов, последовательная очередь,
 * замена временных id, повтор после ошибки сети.
 */

import { describe, it, expect, vi } from 'vitest';
import { diffDocs, EditorSync, type SyncTransport } from '../sync';
import { EMPTY_DOC, type EditorDoc, type EditorObject, type EditorZone } from '../model';
import { addItem, updateItem, removeItem } from '../history';

function makeHouse(id: string, cx = 5): EditorObject {
  return {
    id,
    kind: 'object',
    type: 'building',
    shape: { kind: 'rect', cx, cy: 5, w: 6, h: 4, rot: 0 },
  };
}

function makeZone(id: string): EditorZone {
  return {
    id,
    kind: 'zone',
    condition: 'sunny',
    shape: { kind: 'rect', cx: 2, cy: 2, w: 4, h: 4, rot: 0 },
  };
}

describe('diffDocs', () => {
  it('create / update / delete', () => {
    const a = addItem(addItem(EMPTY_DOC, makeHouse('x')), makeZone('z'));
    const b = removeItem(updateItem(addItem(a, makeHouse('y')), 'x', { label: 'Дом' }), 'z');
    const ops = diffDocs(a, b);
    expect(ops).toEqual([
      expect.objectContaining({ op: 'update', kind: 'object' }),
      expect.objectContaining({ op: 'create', kind: 'object' }),
      expect.objectContaining({ op: 'delete', kind: 'zone', id: 'z' }),
    ]);
  });

  it('удаление элемента с временным id не создаёт delete-операцию', () => {
    const a = addItem(EMPTY_DOC, makeHouse('tmp_9'));
    expect(diffDocs(a, EMPTY_DOC)).toEqual([]);
  });

  it('без изменений — пусто', () => {
    const a = addItem(EMPTY_DOC, makeHouse('x'));
    expect(diffDocs(a, a)).toEqual([]);
  });
});

function mockTransport(overrides: Partial<SyncTransport> = {}) {
  let n = 0;
  const t: SyncTransport = {
    createObject: vi.fn(async () => `srv${++n}`),
    updateObject: vi.fn(async () => {}),
    deleteObject: vi.fn(async () => {}),
    createZone: vi.fn(async () => `srvz${++n}`),
    updateZone: vi.fn(async () => {}),
    deleteZone: vi.fn(async () => {}),
    ...overrides,
  };
  return t;
}

describe('EditorSync', () => {
  it('создание получает постоянный id, последующие правки идут в него', async () => {
    const t = mockTransport();
    const remaps: [string, string][] = [];
    const statuses: string[] = [];
    const sync = new EditorSync({
      gardenId: 'g1',
      transport: t,
      initial: EMPTY_DOC,
      onStatus: (s) => statuses.push(s),
      onIdRemap: (a, b) => remaps.push([a, b]),
    });

    const doc1 = addItem(EMPTY_DOC, makeHouse('tmp_1'));
    sync.push(doc1);
    const doc2 = updateItem(doc1, 'tmp_1', { shape: { kind: 'rect', cx: 8, cy: 5, w: 6, h: 4, rot: 0 } });
    sync.push(doc2);

    expect(await sync.flush()).toBe(true);
    expect(t.createObject).toHaveBeenCalledTimes(1);
    expect(t.updateObject).toHaveBeenCalledTimes(1);
    expect(vi.mocked(t.updateObject).mock.calls[0][0].id).toBe('srv1');
    expect(remaps).toEqual([['tmp_1', 'srv1']]);
    expect(statuses.at(-1)).toBe('saved');
    expect(sync.realId('tmp_1')).toBe('srv1');
  });

  it('очередь последовательная: правки во время сохранения доезжают', async () => {
    let resolveCreate: ((id: string) => void) | null = null;
    const t = mockTransport({
      createObject: vi.fn(
        () => new Promise<string>((res) => { resolveCreate = res; }),
      ),
    });
    const sync = new EditorSync({
      gardenId: 'g1',
      transport: t,
      initial: EMPTY_DOC,
      onStatus: () => {},
      onIdRemap: () => {},
    });

    const doc1 = addItem(EMPTY_DOC, makeHouse('tmp_1'));
    sync.push(doc1);
    await new Promise((r) => setTimeout(r, 10));
    // Пока create висит — двигаем дом ещё раз
    const doc2 = updateItem(doc1, 'tmp_1', { label: 'Дом' });
    sync.push(doc2);
    resolveCreate!('srvA');

    expect(await sync.flush()).toBe(true);
    expect(t.updateObject).toHaveBeenCalledTimes(1);
    expect(vi.mocked(t.updateObject).mock.calls[0][0].label).toBe('Дом');
  });

  it('ошибка сети → статус error, retry() досылает', async () => {
    let failOnce = true;
    const t = mockTransport({
      createObject: vi.fn(async () => {
        if (failOnce) {
          failOnce = false;
          throw new Error('network');
        }
        return 'srvB';
      }),
    });
    const statuses: string[] = [];
    const sync = new EditorSync({
      gardenId: 'g1',
      transport: t,
      initial: EMPTY_DOC,
      onStatus: (s) => statuses.push(s),
      onIdRemap: () => {},
    });

    sync.push(addItem(EMPTY_DOC, makeHouse('tmp_1')));
    expect(await sync.flush()).toBe(false);
    expect(statuses.at(-1)).toBe('error');

    sync.retry();
    expect(await sync.flush()).toBe(true);
    expect(statuses.at(-1)).toBe('saved');
    expect(sync.realId('tmp_1')).toBe('srvB');
  });

  it('удаление никогда не создававшегося элемента не зовёт сервер', async () => {
    const t = mockTransport();
    const sync = new EditorSync({
      gardenId: 'g1',
      transport: t,
      initial: EMPTY_DOC,
      onStatus: () => {},
      onIdRemap: () => {},
    });
    // Добавили и тут же передумали — до сервера дойти не успело бы,
    // но очередь последовательная: create выполнится, затем delete по srv-id
    const doc1 = addItem(EMPTY_DOC, makeHouse('tmp_1'));
    sync.push(doc1);
    expect(await sync.flush()).toBe(true);
    sync.push(EMPTY_DOC);
    expect(await sync.flush()).toBe(true);
    expect(t.deleteObject).toHaveBeenCalledWith('srv1');
  });
});
