/**
 * Задача G.1 — тесты режима «Солнечная вспышка».
 */
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useHighContrast,
  applyHighContrast,
  initHighContrast,
  HIGH_CONTRAST_KEY,
} from "./useHighContrast";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-hc");
});

describe("applyHighContrast", () => {
  it("ставит и снимает data-hc на <html>", () => {
    applyHighContrast(true);
    expect(document.documentElement.getAttribute("data-hc")).toBe("true");
    applyHighContrast(false);
    expect(document.documentElement.hasAttribute("data-hc")).toBe(false);
  });
});

describe("initHighContrast", () => {
  it("применяет сохранённый выбор при старте", () => {
    localStorage.setItem(HIGH_CONTRAST_KEY, "1");
    initHighContrast();
    expect(document.documentElement.getAttribute("data-hc")).toBe("true");
  });
});

describe("useHighContrast", () => {
  it("по умолчанию выключен", () => {
    const { result } = renderHook(() => useHighContrast());
    expect(result.current[0]).toBe(false);
  });

  it("toggle включает режим, пишет в localStorage и в DOM", () => {
    const { result } = renderHook(() => useHighContrast());
    act(() => result.current[1]());
    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem(HIGH_CONTRAST_KEY)).toBe("1");
    expect(document.documentElement.getAttribute("data-hc")).toBe("true");
  });

  it("повторный toggle выключает", () => {
    const { result } = renderHook(() => useHighContrast());
    act(() => result.current[1]());
    act(() => result.current[1]());
    expect(result.current[0]).toBe(false);
    expect(localStorage.getItem(HIGH_CONTRAST_KEY)).toBe("0");
    expect(document.documentElement.hasAttribute("data-hc")).toBe(false);
  });
});
