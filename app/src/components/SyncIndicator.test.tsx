/**
 * Задача F.4 — тесты индикатора синхронизации.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";

let pendingValue = 0;
vi.mock("../lib/offline/queue", () => ({
  count: vi.fn(async () => pendingValue),
  subscribeQueue: vi.fn(() => () => {}),
}));

import { SyncIndicator } from "./SyncIndicator";

function setOnline(v: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value: v });
}

beforeEach(() => {
  cleanup();
  pendingValue = 0;
  setOnline(true);
});

describe("SyncIndicator", () => {
  it("«Всё сохранено» когда очередь пуста", async () => {
    render(<SyncIndicator />);
    await waitFor(() => {
      expect(screen.getByText("Всё сохранено")).toBeInTheDocument();
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("«Синхронизируется…» когда есть отложенные мутации онлайн", async () => {
    pendingValue = 3;
    render(<SyncIndicator />);
    await waitFor(() => {
      expect(screen.getByText(/Синхронизируется/)).toBeInTheDocument();
    });
    expect(screen.getByText(/\(3\)/)).toBeInTheDocument();
  });

  it("«Ждёт связи» когда офлайн и есть мутации", async () => {
    pendingValue = 2;
    setOnline(false);
    render(<SyncIndicator />);
    await waitFor(() => {
      expect(screen.getByText(/Ждёт связи: 2/)).toBeInTheDocument();
    });
  });

  it("badge-вариант скрывает текст, но озвучивает для скринридера", async () => {
    pendingValue = 1;
    render(<SyncIndicator variant="badge" />);
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveAttribute("aria-label", expect.stringMatching(/Синхронизируется/));
    });
    expect(screen.queryByText(/Синхронизируется/)).not.toBeInTheDocument();
  });
});
