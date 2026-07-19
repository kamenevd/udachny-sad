/**
 * Тесты для AiAdvice — «Что посадить тут?» (задача 32.1; миграция на lib/ai — K.1).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockGetPlaceAdvice = vi.fn();

vi.mock("../lib/ai", () => ({
  getPlaceAdvice: (id: string) => mockGetPlaceAdvice(id),
}));

import { AiAdvice } from "../components/AiAdvice";

beforeEach(() => {
  mockGetPlaceAdvice.mockReset();
});

describe("AiAdvice", () => {
  it("показывает совет после нажатия кнопки", async () => {
    mockGetPlaceAdvice.mockResolvedValue("Сажайте бобовые для азота");
    render(<AiAdvice schemaObjectId="obj1" />);
    fireEvent.click(screen.getByText("Что посадить тут?"));
    await waitFor(() =>
      expect(screen.getByText("Сажайте бобовые для азота")).toBeInTheDocument(),
    );
    expect(mockGetPlaceAdvice).toHaveBeenCalledWith("obj1");
  });

  it("показывает ошибку, если запрос упал", async () => {
    mockGetPlaceAdvice.mockRejectedValue(new Error("нет ключа"));
    render(<AiAdvice schemaObjectId="obj1" />);
    fireEvent.click(screen.getByText("Что посадить тут?"));
    await waitFor(() => expect(screen.getByText("нет ключа")).toBeInTheDocument());
  });
});
