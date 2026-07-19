/**
 * Задача H.1 — тесты поиска по канве и математики центрирования.
 */
import { describe, it, expect } from "vitest";
import {
  searchCanvasItems,
  computeFocusTransform,
  centroidOf,
  type CanvasSearchItem,
} from "./useCanvasSearch";

const items: CanvasSearchItem[] = [
  { id: "1", label: "Грядка с томатами", typeName: "Грядка", variety: "Бычье сердце", centroid: { x: 0, y: 0 } },
  { id: "2", label: "Яблоня", typeName: "Дерево", centroid: { x: 0, y: 0 } },
  { id: "3", label: "Теплица", typeName: "Теплица", centroid: { x: 0, y: 0 } },
  { id: "4", label: "Грядка с огурцами", typeName: "Грядка", centroid: { x: 0, y: 0 } },
];

describe("searchCanvasItems", () => {
  it("пустой запрос — нет результатов", () => {
    expect(searchCanvasItems(items, "")).toEqual([]);
    expect(searchCanvasItems(items, "   ")).toEqual([]);
  });

  it("находит по названию", () => {
    const r = searchCanvasItems(items, "яблон");
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe("2");
  });

  it("находит по типу (несколько грядок)", () => {
    const r = searchCanvasItems(items, "грядка");
    expect(r.map((x) => x.id).sort()).toEqual(["1", "4"]);
  });

  it("находит по сорту", () => {
    const r = searchCanvasItems(items, "бычье");
    expect(r[0].id).toBe("1");
  });

  it("точное совпадение ранжируется выше вхождения", () => {
    const r = searchCanvasItems(items, "теплица");
    expect(r[0].id).toBe("3");
  });

  it("нечувствителен к регистру", () => {
    expect(searchCanvasItems(items, "ЯБЛОНЯ")).toHaveLength(1);
  });
});

describe("computeFocusTransform", () => {
  it("центрирует точку во вьюпорте", () => {
    const t = computeFocusTransform({ x: 100, y: 50 }, { width: 400, height: 300 }, 2);
    // screen = position + point*scale должно быть центром вьюпорта
    expect(t.x + 100 * 2).toBe(200); // 400/2
    expect(t.y + 50 * 2).toBe(150); // 300/2
    expect(t.scale).toBe(2);
  });
});

describe("centroidOf", () => {
  it("среднее по точкам", () => {
    expect(centroidOf([[0, 0], [10, 0], [10, 10], [0, 10]])).toEqual({ x: 5, y: 5 });
  });
  it("пустой массив — начало координат", () => {
    expect(centroidOf([])).toEqual({ x: 0, y: 0 });
  });
});
