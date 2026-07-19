/**
 * Задача F.3 — тесты расчёта «мало места».
 */
import { describe, it, expect } from "vitest";
import {
  computeLowSpace,
  LOW_SPACE_BYTES,
  LOW_SPACE_RATIO,
} from "./useStorageEstimate";

const GB = 1024 * 1024 * 1024;

describe("computeLowSpace", () => {
  it("много свободного места — не предупреждаем", () => {
    expect(computeLowSpace(1 * GB, 10 * GB)).toBe(false);
  });

  it("свободно меньше порога — предупреждаем", () => {
    const quota = 1 * GB;
    const usage = quota - (LOW_SPACE_BYTES - 1);
    expect(computeLowSpace(usage, quota)).toBe(true);
  });

  it("занято больше 90% квоты — предупреждаем", () => {
    const quota = 10 * GB;
    const usage = Math.ceil(quota * (LOW_SPACE_RATIO + 0.01));
    expect(computeLowSpace(usage, quota)).toBe(true);
  });

  it("нулевая/неизвестная квота — не предупреждаем", () => {
    expect(computeLowSpace(0, 0)).toBe(false);
    expect(computeLowSpace(100, 0)).toBe(false);
  });
});
