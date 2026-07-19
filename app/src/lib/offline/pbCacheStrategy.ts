/**
 * Задача F.2 — stale-while-revalidate для GET-запросов к PocketBase.
 *
 * При навигации пользователь мгновенно видит закэшированную схему/список,
 * а Service Worker в фоне тянет свежую версию и обновляет кэш к следующему
 * заходу. Кэшируем только «безопасные» GET-запросы к REST API PocketBase
 * (коллекции/записи), но НЕ realtime-подписки (`/api/realtime`) и НЕ файлы
 * (у них свой image-cache) — иначе можно закэшировать SSE-стрим.
 *
 * Логика вынесена сюда (а не только в `public/sw-update.js`), чтобы её можно
 * было покрыть unit-тестами: предикат `isPocketBaseGet` и сам SWR-алгоритм
 * не зависят от глобального окружения Service Worker.
 */

export const PB_CACHE_NAME = "pb-swr-cache-v1";

/** Минимальный «похоже на Request» объект, чтобы функции работали и в тестах. */
export interface RequestLike {
  url: string;
  method: string;
}

/**
 * Кэшируемый ли это GET к PocketBase REST API.
 * Опознаём по пути `/api/collections/.../records` — не по хосту, чтобы работало
 * и на dev-IP (192.168.x), и на проде, и за реверс-прокси.
 */
export function isPocketBaseGet(req: RequestLike): boolean {
  if (req.method !== "GET") return false;
  let pathname: string;
  try {
    pathname = new URL(req.url).pathname;
  } catch {
    return false;
  }
  if (!pathname.includes("/api/collections/")) return false;
  // Записи и файлы коллекций кэшируем; realtime-стрим — нет.
  if (pathname.includes("/api/realtime")) return false;
  return pathname.includes("/records");
}

/** Cache-подобный интерфейс (подмножество CacheStorage.open()). */
export interface CacheLike {
  match(request: RequestLike | string): Promise<Response | undefined>;
  put(request: RequestLike | string, response: Response): Promise<void>;
}

/**
 * Stale-while-revalidate: если в кэше есть ответ — возвращаем его немедленно,
 * а сеть дергаем в фоне и обновляем кэш. Если кэша нет — ждём сеть, кэшируем
 * и отдаём. При сетевой ошибке без кэша — пробрасываем ошибку наверх.
 *
 * @param waitUntil — продлевает жизнь SW до завершения фонового обновления
 *        (в тестах — no-op).
 */
export async function staleWhileRevalidate(
  request: RequestLike,
  cache: CacheLike,
  fetchFn: (req: RequestLike) => Promise<Response>,
  waitUntil: (p: Promise<unknown>) => void = () => {},
): Promise<Response> {
  const cached = await cache.match(request);

  const network = fetchFn(request)
    .then(async (response) => {
      // Кэшируем только успешные (200) или opaque (0) ответы.
      if (response.ok || response.status === 0) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch((err) => {
      // Нет сети и нет кэша — пусть вызывающий разберётся.
      if (!cached) throw err;
      return cached;
    });

  if (cached) {
    waitUntil(network.catch(() => {}));
    return cached;
  }
  return network;
}
