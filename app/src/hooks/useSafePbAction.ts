/**
 * useSafePbAction — PocketBase-аналог useSafeMutation (задача C.2+).
 *
 * useSafeMutation.ts был завязан на convex/react `useMutation` +
 * `FunctionReference` типы Convex — с переходом экранов на PocketBase SDK
 * (задачи C.2-C.7) нужен эквивалент без Convex-специфичных типов: та же
 * toast/haptic/human-readable-error обёртка вокруг произвольной async-функции
 * (обычно вызова `pb.collection(...).create/update/delete`).
 *
 * Пример:
 *   const createGarden = useSafePbAction((data: Partial<Garden>) => gardens.create(data));
 *   await createGarden.mutate({ name: "Дача" });
 */

import { useCallback, useMemo } from "react";
import { useToast } from "../components/Toast";

interface SafePbActionReturn<Args extends unknown[], R> {
  /** Вызвать действие. При ошибке — toast + бросает исключение дальше. */
  mutate: (...args: Args) => Promise<R>;
  /** Вызвать действие. При ошибке — toast + возвращает { ok, error }. Не бросает. */
  mutateWithCatch: (
    ...args: Args
  ) => Promise<{ ok: true; data: R } | { ok: false; error: Error }>;
}

/** Haptic feedback для ошибки — двойная вибрация (задача 16.2). */
function hapticError(): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate([100, 50, 100]);
    } catch {
      /* ignore */
    }
  }
}

/** Человекопонятное сообщение об ошибке действия (PocketBase ClientResponseError и сеть). */
function humanizeError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes("rate limit") || msg.includes("rateLimit") || msg.includes("429")) {
      return "Слишком много действий. Подождите минутку и попробуйте ещё раз.";
    }
    if (msg.includes("network") || msg.includes("fetch") || msg.includes("offline") || msg.includes("Failed to fetch")) {
      return "Нет связи с сервером. Проверьте интернет и попробуйте снова.";
    }
    if (msg.includes("Unauthorized") || msg.includes("unauthenticated") || msg.includes("400") || msg.includes("403")) {
      return "Нужно заново войти в аккаунт.";
    }
    return `Не получилось: ${msg}`;
  }
  return "Что-то пошло не так. Попробуйте ещё раз.";
}

export function useSafePbAction<Args extends unknown[], R>(
  action: (...args: Args) => Promise<R>,
): SafePbActionReturn<Args, R> {
  const { showToast } = useToast();

  const mutate = useCallback(
    async (...args: Args): Promise<R> => {
      try {
        return await action(...args);
      } catch (error) {
        hapticError();
        showToast(humanizeError(error), "error");
        throw error;
      }
    },
    [action, showToast],
  );

  const mutateWithCatch = useCallback(
    async (...args: Args): Promise<{ ok: true; data: R } | { ok: false; error: Error }> => {
      try {
        const data = await action(...args);
        return { ok: true as const, data };
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        hapticError();
        showToast(humanizeError(err), "error");
        return { ok: false as const, error: err };
      }
    },
    [action, showToast],
  );

  return useMemo(() => ({ mutate, mutateWithCatch }), [mutate, mutateWithCatch]);
}
