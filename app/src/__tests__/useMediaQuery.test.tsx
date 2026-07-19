/**
 * Тест useMediaQuery (задача 16.1)
 */
import { describe, it, expect, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useMediaQuery } from "../hooks/useMediaQuery";

const originalMatchMedia = window.matchMedia;

function setMatchMedia(matches: boolean) {
  const listeners: ((e: MediaQueryListEvent) => void)[] = [];
  const mql = {
    matches,
    media: "(max-width: 640px)",
    onchange: null,
    addEventListener: (
      _type: string,
      listener: (e: MediaQueryListEvent) => void,
    ) => listeners.push(listener),
    removeEventListener: (
      _type: string,
      listener: (e: MediaQueryListEvent) => void,
    ) => {
      const i = listeners.indexOf(listener);
      if (i >= 0) listeners.splice(i, 1);
    },
    dispatchEvent: () => false,
  };
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: () => mql,
  });
  return { mql, listeners };
}

afterEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: originalMatchMedia,
  });
});

describe("useMediaQuery", () => {
  it("возвращает true когда media query совпадает", () => {
    setMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery("(max-width: 640px)"));
    expect(result.current).toBe(true);
  });

  it("возвращает false когда media query НЕ совпадает", () => {
    setMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(min-width: 1024px)"));
    expect(result.current).toBe(false);
  });

  it("обновляется при изменении matchMedia", async () => {
    const { mql, listeners } = setMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery("(max-width: 640px)"));
    expect(result.current).toBe(false);
    Object.defineProperty(mql, "matches", { value: true, configurable: true });
    act(() => {
      listeners.forEach((fn) =>
        fn({ matches: true, media: "(max-width: 640px)" } as MediaQueryListEvent),
      );
    });
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("корректно отписывается при unmount", () => {
    const { listeners } = setMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery("(max-width: 640px)"));
    const before = listeners.length;
    unmount();
    expect(listeners.length).toBe(before - 1);
  });

  it("безопасен при отсутствии matchMedia (SSR)", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: undefined,
    });
    const { result } = renderHook(() => useMediaQuery("(max-width: 640px)"));
    expect(result.current).toBe(false);
  });
});
