/**
 * Тесты для SeasonReport — годовой отчёт участка (задача 33.1,
 * обновлён в C.5 под миграцию на PocketBase/pbStats.getSeasonStats).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockStats = {
  year: 2026,
  plantingsStarted: 5,
  plantingsActive: 3,
  deaths: 1,
  bloomingCount: 4,
  diseaseCount: 2,
  pestCount: 0,
  wateringCount: 20,
  totalEventsInYear: 30,
};

vi.mock("../lib/pbStats", () => ({
  getSeasonStats: vi.fn(async () => mockStats),
}));

import { SeasonReport } from "../screens/SeasonReport";

describe("SeasonReport", () => {
  it("показывает агрегированную статистику сезона", async () => {
    render(<SeasonReport gardenId="g1" gardenName="Дача" onBack={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getAllByText("5").length).toBeGreaterThan(0),
    );
    expect(screen.getAllByText("Записей цветения").length).toBeGreaterThan(0);
    expect(screen.getAllByText("4").length).toBeGreaterThan(0);
  });
});
