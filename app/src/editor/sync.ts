/**
 * Автосохранение редактора в PocketBase (EDITOR.md «Сохранение»).
 *
 * Каждое зафиксированное состояние документа сравнивается с последним
 * сохранённым; разница превращается в create/update/delete записей
 * schemaObjects / lightZones и выполняется ПОСЛЕДОВАТЕЛЬНО (очередь).
 * Новые элементы живут с временными id (`tmp_N`) до ответа сервера,
 * затем id заменяется во всей истории (onIdRemap).
 *
 * Ошибка сети не теряет правки: документ остаётся локально, статус
 * «error», retry() продолжает с места остановки.
 */

import type { EditorDoc, EditorObject, EditorZone } from './model';
import { isTempId, objectGeometry, zoneGeometry } from './model';

// ─── Диф документов ────────────────────────────────────────────────────

export type SyncOp =
  | { op: 'create'; kind: 'object'; item: EditorObject }
  | { op: 'create'; kind: 'zone'; item: EditorZone }
  | { op: 'update'; kind: 'object'; item: EditorObject }
  | { op: 'update'; kind: 'zone'; item: EditorZone }
  | { op: 'delete'; kind: 'object' | 'zone'; id: string };

function diffCollection<T extends EditorObject | EditorZone>(
  kind: 'object' | 'zone',
  prev: T[],
  next: T[],
): SyncOp[] {
  const ops: SyncOp[] = [];
  const prevById = new Map(prev.map((i) => [i.id, i]));
  const nextIds = new Set(next.map((i) => i.id));

  for (const item of next) {
    const before = prevById.get(item.id);
    if (!before) {
      ops.push({ op: 'create', kind, item } as SyncOp);
    } else if (JSON.stringify(before) !== JSON.stringify(item)) {
      ops.push({ op: 'update', kind, item } as SyncOp);
    }
  }
  for (const item of prev) {
    if (!nextIds.has(item.id)) {
      // Элемент, не доехавший до сервера, удалять на сервере нечего
      if (!isTempId(item.id)) ops.push({ op: 'delete', kind, id: item.id });
    }
  }
  return ops;
}

export function diffDocs(prev: EditorDoc, next: EditorDoc): SyncOp[] {
  return [
    ...diffCollection('object', prev.objects, next.objects),
    ...diffCollection('zone', prev.zones, next.zones),
  ];
}

// ─── Транспорт (подменяется в тестах) ──────────────────────────────────

export interface SyncTransport {
  createObject: (gardenId: string, item: EditorObject) => Promise<string>;
  updateObject: (item: EditorObject) => Promise<void>;
  deleteObject: (id: string) => Promise<void>;
  createZone: (gardenId: string, item: EditorZone) => Promise<string>;
  updateZone: (item: EditorZone) => Promise<void>;
  deleteZone: (id: string) => Promise<void>;
}

export type SyncStatus = 'saved' | 'saving' | 'error';

export interface EditorSyncOptions {
  gardenId: string;
  transport: SyncTransport;
  /** Последнее сохранённое состояние (то, что загрузили с сервера) */
  initial: EditorDoc;
  onStatus: (status: SyncStatus) => void;
  /** Временный id получил постоянный — обновить историю и выделение */
  onIdRemap: (tempId: string, realId: string) => void;
}

/**
 * Очередь автосохранения. push(doc) можно звать сколько угодно часто —
 * выполняется последовательно, каждый раз до самой свежей версии.
 */
export class EditorSync {
  private synced: EditorDoc;
  private latest: EditorDoc;
  private running = false;
  private failed = false;
  private readonly idMap = new Map<string, string>();

  constructor(private readonly opts: EditorSyncOptions) {
    this.synced = opts.initial;
    this.latest = opts.initial;
  }

  /** Постоянный id для возможно-временного (для создания посадок). */
  realId(id: string): string {
    return this.idMap.get(id) ?? id;
  }

  push(doc: EditorDoc): void {
    this.latest = doc;
    this.failed = false;
    void this.run();
  }

  retry(): void {
    this.failed = false;
    void this.run();
  }

  /** Дождаться, пока всё доедет до сервера (для e2e и посадок). */
  async flush(): Promise<boolean> {
    while (this.running) await new Promise((r) => setTimeout(r, 40));
    return !this.failed && this.latest === this.synced;
  }

  private translate(doc: EditorDoc): EditorDoc {
    if (this.idMap.size === 0) return doc;
    return {
      objects: doc.objects.map((o) =>
        this.idMap.has(o.id) ? { ...o, id: this.idMap.get(o.id)! } : o,
      ),
      zones: doc.zones.map((z) =>
        this.idMap.has(z.id) ? { ...z, id: this.idMap.get(z.id)! } : z,
      ),
    };
  }

  private async run(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.opts.onStatus('saving');
    try {
      while (this.latest !== this.synced && !this.failed) {
        const target = this.latest;
        // Временные id переводим в постоянные С ОБЕИХ сторон дифа:
        // create из прошлой итерации пополнил idMap, и synced мог
        // остаться с tmp-id — без перевода тот же объект создался бы
        // второй раз, а его удаление потерялось бы.
        const translated = this.translate(target);
        const ops = diffDocs(this.translate(this.synced), translated);
        for (const op of ops) {
          await this.execute(op);
        }
        // За время выполнения create idMap мог пополниться — фиксируем
        // состояние сервера с постоянными id
        this.synced = this.translate(translated);
        // Если за время выполнения появились новые правки — ещё круг
        if (this.latest === target) this.latest = this.synced;
      }
      this.opts.onStatus(this.failed ? 'error' : 'saved');
    } catch {
      this.failed = true;
      this.opts.onStatus('error');
    } finally {
      this.running = false;
    }
  }

  private async execute(op: SyncOp): Promise<void> {
    const t = this.opts.transport;
    switch (op.op) {
      case 'create': {
        const tempId = op.item.id;
        const realId =
          op.kind === 'object'
            ? await t.createObject(this.opts.gardenId, op.item as EditorObject)
            : await t.createZone(this.opts.gardenId, op.item as EditorZone);
        // Ремапим не только tmp_N: undo после удаления воссоздаёт запись
        // со старым (уже несуществующим) id — сервер выдаёт новый
        if (realId !== tempId) {
          this.idMap.set(tempId, realId);
          this.opts.onIdRemap(tempId, realId);
        }
        break;
      }
      case 'update':
        if (op.kind === 'object') await t.updateObject(op.item as EditorObject);
        else await t.updateZone(op.item as EditorZone);
        break;
      case 'delete':
        if (op.kind === 'object') await t.deleteObject(op.id);
        else await t.deleteZone(op.id);
        break;
    }
  }
}

// ─── Боевой транспорт поверх lib/pb ────────────────────────────────────

import { schemaObjects as schemaObjectsApi, lightZones as lightZonesApi } from '../lib/pb';

export function pbTransport(): SyncTransport {
  return {
    createObject: async (gardenId, item) => {
      const rec = await schemaObjectsApi.create({
        gardenId,
        type: item.type,
        label: item.label,
        geometry: objectGeometry(item),
        sortOrder: item.sortOrder,
      });
      return rec.id;
    },
    updateObject: async (item) => {
      await schemaObjectsApi.update(item.id, {
        label: item.label ?? '',
        geometry: objectGeometry(item),
      });
    },
    deleteObject: async (id) => {
      await schemaObjectsApi.remove(id);
    },
    createZone: async (gardenId, item) => {
      const rec = await lightZonesApi.create({
        gardenId,
        condition: item.condition,
        geometry: zoneGeometry(item),
      });
      return rec.id;
    },
    updateZone: async (item) => {
      await lightZonesApi.update(item.id, {
        condition: item.condition,
        geometry: zoneGeometry(item),
      });
    },
    deleteZone: async (id) => {
      await lightZonesApi.remove(id);
    },
  };
}
