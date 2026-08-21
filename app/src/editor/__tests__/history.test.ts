/**
 * Тесты истории: commit/undo/redo, лимит, remapId по всем снимкам.
 */

import { describe, it, expect } from 'vitest';
import {
  initHistory,
  commit,
  undo,
  redo,
  canUndo,
  canRedo,
  addItem,
  updateItem,
  removeItem,
  remapId,
} from '../history';
import { EMPTY_DOC, type EditorDoc, type EditorObject } from '../model';

function makeHouse(id: string): EditorObject {
  return {
    id,
    kind: 'object',
    type: 'building',
    shape: { kind: 'rect', cx: 5, cy: 5, w: 6, h: 4, rot: 0 },
  };
}

describe('история', () => {
  it('commit → undo → redo', () => {
    let h = initHistory(EMPTY_DOC);
    expect(canUndo(h)).toBe(false);

    const doc1 = addItem(EMPTY_DOC, makeHouse('a'));
    h = commit(h, doc1);
    expect(canUndo(h)).toBe(true);
    expect(h.present.objects).toHaveLength(1);

    h = undo(h);
    expect(h.present.objects).toHaveLength(0);
    expect(canRedo(h)).toBe(true);

    h = redo(h);
    expect(h.present.objects).toHaveLength(1);
  });

  it('новый commit сбрасывает redo-ветку', () => {
    let h = initHistory(EMPTY_DOC);
    h = commit(h, addItem(EMPTY_DOC, makeHouse('a')));
    h = undo(h);
    h = commit(h, addItem(EMPTY_DOC, makeHouse('b')));
    expect(canRedo(h)).toBe(false);
    expect(h.present.objects[0].id).toBe('b');
  });

  it('commit того же снимка — no-op', () => {
    let h = initHistory(EMPTY_DOC);
    h = commit(h, h.present);
    expect(canUndo(h)).toBe(false);
  });

  it('лимит 50 шагов', () => {
    let h = initHistory(EMPTY_DOC);
    let doc: EditorDoc = EMPTY_DOC;
    for (let i = 0; i < 60; i++) {
      doc = addItem(doc, makeHouse(`o${i}`));
      h = commit(h, doc);
    }
    expect(h.past).toHaveLength(50);
  });

  it('updateItem/removeItem обновляют нужный элемент', () => {
    const doc1 = addItem(EMPTY_DOC, makeHouse('a'));
    const doc2 = updateItem(doc1, 'a', { label: 'Баня' });
    expect((doc2.objects[0] as EditorObject).label).toBe('Баня');
    const doc3 = removeItem(doc2, 'a');
    expect(doc3.objects).toHaveLength(0);
  });

  it('remapId меняет id во всех снимках: undo ссылается на живую запись', () => {
    let h = initHistory(EMPTY_DOC);
    const withTemp = addItem(EMPTY_DOC, makeHouse('tmp_1'));
    h = commit(h, withTemp);
    h = commit(h, updateItem(withTemp, 'tmp_1', { label: 'Дом' }));

    h = remapId(h, 'tmp_1', 'real42');
    expect(h.present.objects[0].id).toBe('real42');
    const back = undo(h);
    expect(back.present.objects[0].id).toBe('real42');
  });
});
