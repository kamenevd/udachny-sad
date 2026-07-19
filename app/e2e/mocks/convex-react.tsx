/**
 * Мок convex/react для E2E (vite --mode e2e, см. resolve.alias).
 * Данные — из in-memory store (./store), реактивность — через
 * useSyncExternalStore: мутация → notify → ре-рендер подписчиков.
 */

import { type ReactNode, useCallback, useSyncExternalStore } from "react";
import { getFunctionName } from "convex/server";
import { authState, getVersion, runMutation, runQuery, subscribe } from "./store";

export class ConvexReactClient {
  constructor(_url: string) {}
  setAuth(_fetchToken: unknown, _onChange?: unknown) {}
  clearAuth() {}
  close() {}
}

function useStoreVersion(): number {
  return useSyncExternalStore(subscribe, getVersion);
}

export function useQuery(ref: unknown, args?: unknown): unknown {
  useStoreVersion();
  if (args === "skip") return undefined;
  return runQuery(getFunctionName(ref as never), (args ?? {}) as Record<string, unknown>);
}

export function useMutation(ref: unknown) {
  const name = getFunctionName(ref as never);
  return useCallback(
    (args?: unknown) => runMutation(name, (args ?? {}) as Record<string, unknown>),
    [name],
  );
}

export function useConvexAuth() {
  useStoreVersion();
  return { isLoading: false, isAuthenticated: authState.authed };
}

export function Authenticated({ children }: { children: ReactNode }) {
  useStoreVersion();
  return authState.authed ? <>{children}</> : null;
}

export function Unauthenticated({ children }: { children: ReactNode }) {
  useStoreVersion();
  return authState.authed ? null : <>{children}</>;
}

export function AuthLoading(_props: { children: ReactNode }) {
  return null;
}
