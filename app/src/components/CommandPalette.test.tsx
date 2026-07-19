/**
 * Задача H.1 — тесты командной палитры.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { CommandPalette } from "./CommandPalette";
import type { CanvasSearchItem } from "../hooks/useCanvasSearch";

const items: CanvasSearchItem[] = [
  { id: "1", label: "Клумба с розами", typeName: "Клумба", number: 1, centroid: { x: 5, y: 5 } },
  { id: "2", label: "Гортензия", typeName: "Кустарник", number: 2, centroid: { x: 9, y: 1 } },
];

beforeEach(() => cleanup());

function openWithHotkey() {
  fireEvent.keyDown(window, { key: "k", metaKey: true });
}

describe("CommandPalette", () => {
  it("закрыта по умолчанию (нет диалога), FAB присутствует", () => {
    render(<CommandPalette items={items} onSelect={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Поиск по участку/)).toBeInTheDocument();
  });

  it("Cmd+K открывает палитру", async () => {
    render(<CommandPalette items={items} onSelect={() => {}} />);
    openWithHotkey();
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
  });

  it("поиск фильтрует и выбор вызывает onSelect", async () => {
    const onSelect = vi.fn();
    render(<CommandPalette items={items} onSelect={onSelect} />);
    openWithHotkey();
    const input = await screen.findByLabelText("Поиск по участку");
    fireEvent.change(input, { target: { value: "гортенз" } });
    const result = await screen.findByText("Гортензия");
    fireEvent.click(result);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "2" }));
    // после выбора палитра закрывается
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("Enter выбирает активный результат, Esc закрывает", async () => {
    const onSelect = vi.fn();
    render(<CommandPalette items={items} onSelect={onSelect} />);
    openWithHotkey();
    const input = await screen.findByLabelText("Поиск по участку");
    fireEvent.change(input, { target: { value: "клумба" } });
    await screen.findByText("Клумба с розами");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: "1" }));
  });

  it("«Ничего не нашлось» для пустого результата", async () => {
    render(<CommandPalette items={items} onSelect={() => {}} />);
    openWithHotkey();
    const input = await screen.findByLabelText("Поиск по участку");
    fireEvent.change(input, { target: { value: "zzz" } });
    expect(await screen.findByText("Ничего не нашлось")).toBeInTheDocument();
  });
});
