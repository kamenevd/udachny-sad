/**
 * Тесты для AiCareTip — «Совет» по уходу за посадкой (задача 32.3; миграция на lib/ai — K.1).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockGetCareTip = vi.fn();

vi.mock("../lib/ai", () => ({
  getCareTip: (id: string) => mockGetCareTip(id),
}));

import { AiCareTip } from "../components/AiCareTip";

beforeEach(() => {
  mockGetCareTip.mockReset();
});

describe("AiCareTip", () => {
  it("показывает совет по уходу после нажатия кнопки", async () => {
    mockGetCareTip.mockResolvedValue("Поливайте раз в неделю");
    render(<AiCareTip plantingId="p1" />);
    fireEvent.click(screen.getByText("Совет"));
    await waitFor(() =>
      expect(screen.getByText("Поливайте раз в неделю")).toBeInTheDocument(),
    );
    expect(mockGetCareTip).toHaveBeenCalledWith("p1");
  });

  it("показывает ошибку, если запрос упал", async () => {
    mockGetCareTip.mockRejectedValue(new Error("нет ключа"));
    render(<AiCareTip plantingId="p1" />);
    fireEvent.click(screen.getByText("Совет"));
    await waitFor(() => expect(screen.getByText("нет ключа")).toBeInTheDocument());
  });
});
