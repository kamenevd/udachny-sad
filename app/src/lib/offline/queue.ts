/**
 * Задача F.1 — офлайн-очередь мутаций поверх IndexedDB (пакет `idb`).
 *
 * При потере сети запись в журнал / посадка / любое CRUD-действие
 * складывается в персистентную очередь в IndexedDB и переживает перезагрузку
 * вкладки. `syncEngine.ts` разгребает очередь при восстановлении связи.
 *
 * Здесь же живёт крошечный эмиттер (subscribe/emit) — чтобы UI-индикатор
 * синхронизации (SyncIndicator, F.4) реагировал на изменение размера очереди
 * без циклической зависимости queue ↔ syncEngine.
 */
import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "udachny-offline";
const STORE = "mutations";
const DB_VERSION = 1;

export type MutationOp = "create" | "update" | "delete";

/** Что кладём в очередь (без служебных полей). */
export interface MutationInput {
  collection: string;
  op: MutationOp;
  /** Для update/delete — id записи PocketBase. */
  recordId?: string;
  /** Для create/update — тело запроса. */
  data?: Record<string, unknown>;
}

/** Запись очереди, как она хранится в IndexedDB. */
export interface QueuedMutation extends MutationInput {
  id: string;
  createdAt: number;
  retries: number;
}

// ─── Доступ к IndexedDB (SSR/приватный режим — graceful no-op) ───

function hasIndexedDB(): boolean {
  return typeof indexedDB !== "undefined";
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> | null {
  if (!hasIndexedDB()) return null;
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

// ─── Эмиттер изменений очереди ───

type Listener = (pending: number) => void;
const listeners = new Set<Listener>();

/** Подписка на изменение размера очереди. Возвращает функцию отписки. */
export function subscribeQueue(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

async function emitChange(): Promise<void> {
  const pending = await count();
  for (const l of listeners) l(pending);
}

// ─── CRUD очереди ───

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function enqueue(input: MutationInput): Promise<QueuedMutation> {
  const item: QueuedMutation = {
    ...input,
    id: genId(),
    createdAt: Date.now(),
    retries: 0,
  };
  const db = getDB();
  if (db) {
    await (await db).put(STORE, item);
    await emitChange();
  }
  return item;
}

export async function getAll(): Promise<QueuedMutation[]> {
  const db = getDB();
  if (!db) return [];
  const all = (await (await db).getAll(STORE)) as QueuedMutation[];
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function remove(id: string): Promise<void> {
  const db = getDB();
  if (!db) return;
  await (await db).delete(STORE, id);
  await emitChange();
}

export async function put(item: QueuedMutation): Promise<void> {
  const db = getDB();
  if (!db) return;
  await (await db).put(STORE, item);
  await emitChange();
}

export async function count(): Promise<number> {
  const db = getDB();
  if (!db) return 0;
  return (await db).count(STORE);
}

export async function clear(): Promise<void> {
  const db = getDB();
  if (!db) return;
  await (await db).clear(STORE);
  await emitChange();
}
