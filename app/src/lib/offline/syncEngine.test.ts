/**
 * Задача F.1 — тесты движка синхронизации офлайн-очереди.
 *
 * Проверяем логику flushQueue поверх замоканной очереди и PocketBase:
 * успех удаляет запись, ошибка увеличивает retries, «отравленная» мутация
 * (retries >= MAX_RETRIES) удаляется чтобы не блокировать очередь.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { QueuedMutation } from "./queue";

// ─── Моки очереди и PocketBase ───

let store: QueuedMutation[] = [];

vi.mock("./queue", () => ({
  getAll: vi.fn(async () => [...store].sort((a, b) => a.createdAt - b.createdAt)),
  remove: vi.fn(async (id: string) => {
    store = store.filter((m) => m.id !== id);
  }),
  put: vi.fn(async (item: QueuedMutation) => {
    store = store.map((m) => (m.id === item.id ? item : m));
  }),
  count: vi.fn(async () => store.length),
  subscribeQueue: vi.fn(() => () => {}),
}));

const create = vi.fn();
const update = vi.fn();
const del = vi.fn();

vi.mock("../pb", () => ({
  pb: {
    collection: () => ({ create, update, delete: del }),
  },
}));

import { flushQueue } from "./syncEngine";

function makeMutation(over: Partial<QueuedMutation> = {}): QueuedMutation {
  return {
    id: `id-${Math.random()}`,
    collection: "journalEvents",
    op: "create",
    data: { note: "тест" },
    createdAt: Date.now(),
    retries: 0,
    ...over,
  };
}

describe("syncEngine.flushQueue", () => {
  beforeEach(() => {
    store = [];
    create.mockReset();
    update.mockReset();
    del.mockReset();
  });

  it("пустая очередь — 0 synced / 0 failed", async () => {
    const res = await flushQueue();
    expect(res).toEqual({ synced: 0, failed: 0 });
  });

  it("успешно отправляет create и удаляет из очереди", async () => {
    store = [makeMutation({ id: "a" })];
    create.mockResolvedValue({ id: "server-1" });
    const res = await flushQueue();
    expect(create).toHaveBeenCalledWith({ note: "тест" });
    expect(res).toEqual({ synced: 1, failed: 0 });
    expect(store).toHaveLength(0);
  });

  it("маршрутизирует update/delete по recordId", async () => {
    store = [
      makeMutation({ id: "u", op: "update", recordId: "rec1", data: { x: 1 } }),
      makeMutation({ id: "d", op: "delete", recordId: "rec2" }),
    ];
    update.mockResolvedValue({});
    del.mockResolvedValue({});
    const res = await flushQueue();
    expect(update).toHaveBeenCalledWith("rec1", { x: 1 });
    expect(del).toHaveBeenCalledWith("rec2");
    expect(res.synced).toBe(2);
    expect(store).toHaveLength(0);
  });

  it("при ошибке увеличивает retries и оставляет в очереди", async () => {
    store = [makeMutation({ id: "a", retries: 0 })];
    create.mockRejectedValue(new Error("network"));
    const res = await flushQueue();
    expect(res).toEqual({ synced: 0, failed: 1 });
    expect(store).toHaveLength(1);
    expect(store[0].retries).toBe(1);
  });

  it("удаляет «отравленную» мутацию после MAX_RETRIES", async () => {
    store = [makeMutation({ id: "a", retries: 4 })]; // 4 -> 5 == MAX_RETRIES
    create.mockRejectedValue(new Error("network"));
    const res = await flushQueue();
    expect(res).toEqual({ synced: 0, failed: 1 });
    expect(store).toHaveLength(0);
  });
});
