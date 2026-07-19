/**
 * Задача C.1 — клиент PocketBase + типизированные CRUD-обёртки.
 *
 * Заменяет convex/react `useQuery`/`useMutation` (api.gardens.*, api.plantings.*
 * и т.д.). Экраны переходят на эти функции по мере миграции (задачи C.2-C.7);
 * до завершения миграции Convex остаётся основным источником данных — этот
 * файл пока не подключён ни к одному экрану.
 *
 * ⚠️ Не проверено на живом PocketBase (нет admin-доступа к LXC 108, чтобы
 * применить pb_migrations/ и погонять реальные запросы) — только по
 * официальному SDK (`pocketbase` npm, README/типы пакета) и tsc.
 */
import PocketBase, { type RecordModel } from "pocketbase";

export const POCKETBASE_URL =
  import.meta.env.VITE_POCKETBASE_URL ?? "http://192.168.3.59:8090";

export const pb = new PocketBase(POCKETBASE_URL);

// ─── Типы записей (1:1 с pb_migrations/001_init.js / convex/schema.ts) ────

export interface PbUser extends RecordModel {
  name?: string;
  avatar?: string;
  email?: string;
  role?: "user" | "admin";
  locale?: string;
  telegramId?: string;
}

export interface Garden extends RecordModel {
  ownerId: string;
  name: string;
  description?: string;
  boundary?: { points: number[][] };
  originGps?: { lat: number; lng: number };
  canvasConfig?: { scale?: number; background?: string; unitLabel?: string };
}

export type SchemaObjectType =
  | "building" | "lawn" | "path" | "flowerbed" | "composition" | "hedge"
  | "tree" | "shrub" | "water" | "gate" | "other";

export interface SchemaObject extends RecordModel {
  gardenId: string;
  type: SchemaObjectType;
  label?: string;
  geometry: { type: string; points: number[][] };
  style?: { color?: string; fillColor?: string; strokeWidth?: number; icon?: string };
  sortOrder?: number;
}

export interface LightZone extends RecordModel {
  gardenId: string;
  name?: string;
  geometry: { points: number[][] };
  condition: "sunny" | "partial_shade" | "shade";
  style?: { color?: string; opacity?: number };
}

export interface MoistureZone extends RecordModel {
  gardenId: string;
  name?: string;
  geometry: { points: number[][] };
  condition: "dry" | "moderate" | "wet";
  style?: { color?: string; opacity?: number };
}

export interface Plant extends RecordModel {
  userId: string;
  plantType: string;
  name: string;
  variety?: string;
  description?: string;
  catalogId?: string;
}

export type PlantingStatus = "active" | "dead" | "completed" | "relocated";

export interface Planting extends RecordModel {
  gardenId: string;
  plantId: string;
  schemaObjectId?: string;
  positionNote?: string;
  plantedAt: string;
  status: PlantingStatus;
  endedAt?: string;
  relocatedToPlantingId?: string;
  quantity?: number;
  notes?: string;
}

export type EventType =
  | "planting" | "watering" | "blooming" | "pruning" | "winterizing"
  | "disease" | "pest" | "fertilizing" | "transplant"
  | "death" | "other";

export interface JournalEvent extends RecordModel {
  plantingId: string;
  eventType: EventType;
  eventDate: string;
  title?: string;
  description?: string;
  metadata?: {
    weather?: { temperature?: number; condition?: string };
    diagnosis?: string;
    severity?: string;
    notes?: string;
  };
}

export type PhotoOwnerType = "planting" | "journalEvent" | "schemaObject";

export interface Photo extends RecordModel {
  ownerType: PhotoOwnerType;
  ownerId: string;
  file: string;
  caption?: string;
  width?: number;
  height?: number;
  fileSize?: number;
}

// ─── CRUD-обёртки ───────────────────────────────────────────────────────
//
// Тонкие типизированные враперы вокруг pb.collection(...) — не скрывают
// PocketBase SDK полностью (фильтры/сортировки экраны всё равно строят сами
// через getList/getFullList), а просто дают collection-специфичные типы,
// как gardens.list()/create()/update()/remove() в задаче.

function crud<T extends RecordModel>(name: string) {
  const col = () => pb.collection(name);
  return {
    list: (options?: { sort?: string; filter?: string }) =>
      col().getFullList<T>({ sort: options?.sort, filter: options?.filter }),
    getOne: (id: string) => col().getOne<T>(id),
    create: (data: Partial<T> | FormData) => col().create<T>(data),
    update: (id: string, data: Partial<T> | FormData) => col().update<T>(id, data),
    remove: (id: string) => col().delete(id),
    subscribe: (topic: string, cb: (e: { action: string; record: T }) => void) =>
      col().subscribe<T>(topic, cb),
    unsubscribe: (topic?: string) => col().unsubscribe(topic),
  };
}

export const gardens = crud<Garden>("gardens");
export const schemaObjects = crud<SchemaObject>("schemaObjects");
export const lightZones = crud<LightZone>("lightZones");
export const moistureZones = crud<MoistureZone>("moistureZones");
export const plants = crud<Plant>("plants");
export const plantings = crud<Planting>("plantings");
export const journalEvents = crud<JournalEvent>("journalEvents");
export const photos = crud<Photo>("photos");

/** URL файла фото — аналог Convex `storage.getUrl()` (задача C.6). */
export function photoUrl(photo: Photo, thumb?: string): string {
  return pb.files.getURL(photo, photo.file, thumb ? { thumb } : undefined);
}

// Задача C.6: records `photos` с полиморфным ownerId НЕ каскадируются
// автоматически при удалении schemaObject/planting/journalEvent (ownerId —
// не relation-поле, PocketBase cascadeDelete на него не распространяется).
// Решено на клиенте — `deletePhotosFor()` в lib/pbBackup.ts вызывается перед
// удалением владельца во всех местах (ObjectSheet, PlantingDetail, каскад
// removeGardenCascade). Не атомарно (как и остальные каскады в pbBackup.ts) —
// при обрыве связи между шагами возможен orphan-файл; для MVP-масштаба
// риск невелик. Надёжнее — pb_hooks-хук onRecordAfterDeleteSuccess, но это
// вне рамок C.6.
