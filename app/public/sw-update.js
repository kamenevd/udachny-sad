/**
 * Задача F.2 — stale-while-revalidate для GET-запросов к PocketBase.
 *
 * Этот скрипт подключается к сгенерированному workbox Service Worker через
 * `importScripts` (см. workbox.importScripts в vite.config.ts). Он перехватывает
 * GET-запросы к REST API PocketBase (`/api/collections/.../records`) и отдаёт
 * закэшированную копию мгновенно, обновляя кэш в фоне.
 *
 * Логика зеркалит src/lib/offline/pbCacheStrategy.ts (тот покрыт unit-тестами);
 * здесь — самодостаточная JS-версия, т.к. SW не умеет импортировать TS-модуль.
 */
/* eslint-disable no-restricted-globals */

const PB_CACHE_NAME = "pb-swr-cache-v1";

function isPocketBaseGet(request) {
  if (request.method !== "GET") return false;
  let pathname;
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    return false;
  }
  if (!pathname.includes("/api/collections/")) return false;
  if (pathname.includes("/api/realtime")) return false;
  return pathname.includes("/records");
}

async function pbStaleWhileRevalidate(event) {
  const cache = await caches.open(PB_CACHE_NAME);
  const cached = await cache.match(event.request);

  const network = fetch(event.request)
    .then((response) => {
      if (response.ok || response.status === 0) {
        cache.put(event.request, response.clone());
      }
      return response;
    })
    .catch((err) => {
      if (cached) return cached;
      throw err;
    });

  if (cached) {
    event.waitUntil(network.catch(() => {}));
    return cached;
  }
  return network;
}

self.addEventListener("fetch", (event) => {
  if (isPocketBaseGet(event.request)) {
    event.respondWith(pbStaleWhileRevalidate(event));
  }
});
