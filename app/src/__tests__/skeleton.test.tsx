/**
 * Тест Skeleton — рендер скелетонов, проверка классов и aria (задача 15.2)
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  PlantCardSkeleton,
  SkeletonLineItem,
  SkeletonList,
  SkeletonHeader,
  SkeletonLines,
} from "../components/Skeleton";

describe("PlantCardSkeleton", () => {
  it("рендерится с двойной рамкой и aria-hidden", () => {
    const { container } = render(<PlantCardSkeleton />);
    // внешняя рамка бумажного стиля
    const outer = container.firstChild as HTMLElement;
    expect(outer.className).toContain("border-ink");
    expect(outer.className).toContain("bg-surface");
    expect(outer.getAttribute("aria-hidden")).toBe("true");
  });

  it("содержит несколько shimmer-блоков", () => {
    const { container } = render(<PlantCardSkeleton />);
    const shimmers = container.querySelectorAll(".animate-pulse");
    expect(shimmers.length).toBeGreaterThanOrEqual(4);
  });
});

describe("SkeletonLineItem", () => {
  it("рендерится с aria-hidden", () => {
    const { container } = render(<SkeletonLineItem />);
    expect((container.firstChild as HTMLElement).getAttribute("aria-hidden")).toBe("true");
  });
});

describe("SkeletonList", () => {
  it("по умолчанию рендерит 3 элемента", () => {
    const { container } = render(<SkeletonList />);
    const items = container.querySelectorAll(".animate-pulse");
    // каждый SkeletonLineItem содержит 4 shimmer-блока → минимум 12
    expect(items.length).toBeGreaterThanOrEqual(12);
  });

  it("рендерит указанное число элементов", () => {
    const { container } = render(<SkeletonList count={5} />);
    // внешний div у каждого SkeletonLineItem
    const lines = container.querySelectorAll("[aria-hidden=\"true\"]");
    expect(lines.length).toBeGreaterThanOrEqual(5);
  });
});

describe("SkeletonHeader", () => {
  it("sticky позиционирование", () => {
    const { container } = render(<SkeletonHeader />);
    const header = container.firstChild as HTMLElement;
    expect(header.className).toContain("sticky");
    expect(header.className).toContain("top-0");
  });
});

describe("SkeletonLines", () => {
  it("по умолчанию 3 строки", () => {
    const { container } = render(<SkeletonLines />);
    const lines = container.querySelectorAll(".animate-pulse");
    expect(lines).toHaveLength(3);
  });

  it("рендерит указанное число строк", () => {
    const { container } = render(<SkeletonLines count={7} />);
    const lines = container.querySelectorAll(".animate-pulse");
    expect(lines).toHaveLength(7);
  });

  it("принимает className", () => {
    const { container } = render(<SkeletonLines className="mt-4" />);
    expect((container.firstChild as HTMLElement).className).toContain("mt-4");
  });
});
