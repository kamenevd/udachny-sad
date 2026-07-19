/**
 * Задача F.2 — тесты SWR-стратегии для PocketBase GET.
 */
import { describe, it, expect, vi } from "vitest";
import {
  isPocketBaseGet,
  staleWhileRevalidate,
  type CacheLike,
  type RequestLike,
} from "./pbCacheStrategy";

const PB = "http://192.168.3.59:8090";

describe("isPocketBaseGet", () => {
  it("кэширует GET к records коллекции", () => {
    expect(
      isPocketBaseGet({ method: "GET", url: `${PB}/api/collections/plantings/records` }),
    ).toBe(true);
  });

  it("не кэширует POST/PATCH/DELETE", () => {
    for (const method of ["POST", "PATCH", "DELETE"]) {
      expect(
        isPocketBaseGet({ method, url: `${PB}/api/collections/plantings/records` }),
      ).toBe(false);
    }
  });

  it("не кэширует realtime-подписки", () => {
    expect(isPocketBaseGet({ method: "GET", url: `${PB}/api/realtime` })).toBe(false);
  });

  it("не кэширует посторонние GET", () => {
    expect(isPocketBaseGet({ method: "GET", url: `${PB}/api/health` })).toBe(false);
    expect(isPocketBaseGet({ method: "GET", url: "https://example.com/x" })).toBe(false);
  });

  it("устойчив к битому url", () => {
    expect(isPocketBaseGet({ method: "GET", url: "not a url" })).toBe(false);
  });
});

function makeCache(initial?: Response): CacheLike & { store: Response | undefined } {
  return {
    store: initial,
    async match() {
      return this.store;
    },
    async put(_req: RequestLike | string, res: Response) {
      this.store = res;
    },
  };
}

function res(body: string, status = 200): Response {
  return new Response(body, { status });
}

const req: RequestLike = {
  method: "GET",
  url: `${PB}/api/collections/plantings/records`,
};

describe("staleWhileRevalidate", () => {
  it("отдаёт кэш мгновенно и обновляет в фоне", async () => {
    const cache = makeCache(res("cached"));
    const fetchFn = vi.fn(async () => res("fresh"));
    const waited: Promise<unknown>[] = [];

    const out = await staleWhileRevalidate(req, cache, fetchFn, (p) => waited.push(p));
    expect(await out.text()).toBe("cached");
    expect(fetchFn).toHaveBeenCalledOnce();

    await Promise.all(waited);
    expect(await cache.store!.text()).toBe("fresh");
  });

  it("без кэша — ждёт сеть, кэширует и отдаёт", async () => {
    const cache = makeCache(undefined);
    const fetchFn = vi.fn(async () => res("fresh"));

    const out = await staleWhileRevalidate(req, cache, fetchFn);
    expect(await out.clone().text()).toBe("fresh");
    expect(cache.store).toBeDefined();
  });

  it("без кэша и с ошибкой сети — пробрасывает ошибку", async () => {
    const cache = makeCache(undefined);
    const fetchFn = vi.fn(async () => {
      throw new Error("offline");
    });
    await expect(staleWhileRevalidate(req, cache, fetchFn)).rejects.toThrow("offline");
  });

  it("с кэшем и ошибкой сети — возвращает кэш", async () => {
    const cache = makeCache(res("cached"));
    const fetchFn = vi.fn(async () => {
      throw new Error("offline");
    });
    const out = await staleWhileRevalidate(req, cache, fetchFn);
    expect(await out.text()).toBe("cached");
  });

  it("не кэширует ответы с ошибочным статусом (404)", async () => {
    const cache = makeCache(undefined);
    const fetchFn = vi.fn(async () => res("nope", 404));
    const out = await staleWhileRevalidate(req, cache, fetchFn);
    expect(out.status).toBe(404);
    expect(cache.store).toBeUndefined();
  });
});
