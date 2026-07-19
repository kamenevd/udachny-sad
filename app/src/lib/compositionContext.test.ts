/**
 * Задача H.2 — тесты сборки контекста клумбы/композиции.
 */
import { describe, it, expect } from "vitest";
import {
  buildCompositionContext,
  dominantLightLabel,
  pointInPolygon,
  type CompositionHistoryPlanting,
} from "./compositionContext";

const NOW = new Date("2026-07-18").getTime();

describe("dominantLightLabel", () => {
  it("пусто → undefined", () => {
    expect(dominantLightLabel([])).toBeUndefined();
  });
  it("самое частое условие", () => {
    expect(dominantLightLabel(["sunny", "sunny", "shade"])).toBe("Солнечно");
    expect(dominantLightLabel(["partial_shade"])).toBe("Полутень");
  });
});

describe("buildCompositionContext", () => {
  const history: CompositionHistoryPlanting[] = [
    { plantName: "Флоксы", plantedAt: "2025-05-01", diseases: ["мучнистая роса"] },
    { plantName: "Хосты", plantedAt: "2024-05-01", diseases: [] },
    { plantName: "Пионы", plantedAt: "2026-05-01", diseases: [] }, // текущий год — не «прошлый сезон»
  ];

  it("прошлый сезон — самый свежий год строго до текущего", () => {
    const ctx = buildCompositionContext(history, ["sunny"], NOW);
    expect(ctx.lastSeason?.year).toBe(2025);
    expect(ctx.lastSeason?.label).toBe("В прошлом году");
    expect(ctx.lastSeason?.plants).toEqual([
      { plantName: "Флоксы", diseases: ["мучнистая роса"] },
    ]);
  });

  it("считает сезоны и подпись освещённости", () => {
    const ctx = buildCompositionContext(history, ["shade", "shade"], NOW);
    expect(ctx.seasonsTracked).toBe(3);
    expect(ctx.lightLabel).toBe("Тень");
  });

  it("год N-2 → явная подпись «В NNNN году»", () => {
    const ctx = buildCompositionContext(
      [{ plantName: "Кабачок", plantedAt: "2024-06-01", diseases: [] }],
      [],
      NOW,
    );
    expect(ctx.lastSeason?.label).toBe("В 2024 году");
  });

  it("нет прошлых сезонов → lastSeason undefined", () => {
    const ctx = buildCompositionContext(
      [{ plantName: "Редис", plantedAt: "2026-04-01", diseases: [] }],
      [],
      NOW,
    );
    expect(ctx.lastSeason).toBeUndefined();
  });
});

describe("pointInPolygon", () => {
  const square = [[0, 0], [10, 0], [10, 10], [0, 10]];
  it("точка внутри", () => {
    expect(pointInPolygon({ x: 5, y: 5 }, square)).toBe(true);
  });
  it("точка снаружи", () => {
    expect(pointInPolygon({ x: 15, y: 5 }, square)).toBe(false);
  });
});
