/**
 * Тест SearchOnCanvas (задача 34.4)
 */
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { SearchOnCanvas } from "../components/canvas/SearchOnCanvas";
import type { ExplicationItem } from "../components/Explication";

const items: ExplicationItem[] = [
  { number: 1, name: "Грядка", note: "3 шт" },
  { number: 2, name: "Яблоня Антоновка" },
  { number: 3, name: "Теплица" },
];

function open() {
  fireEvent.click(screen.getByLabelText("Поиск объектов на схеме"));
}

describe("SearchOnCanvas", () => {
  it("разворачивается по клику на лупу", () => {
    render(<SearchOnCanvas items={items} selectedNumber={null} onHighlight={vi.fn()} />);
    open();
    expect(screen.getByPlaceholderText(/Грядка/)).toBeTruthy();
  });

  it("фильтрует по названию объекта", () => {
    render(<SearchOnCanvas items={items} selectedNumber={null} onHighlight={vi.fn()} />);
    open();
    fireEvent.change(screen.getByLabelText("Поиск объектов на схеме"), {
      target: { value: "антонов" },
    });
    expect(screen.getByText("Яблоня Антоновка")).toBeTruthy();
    expect(screen.queryByText("Теплица")).toBeNull();
  });

  it("тап по результату подсвечивает группу (onHighlight с номером)", () => {
    const onHighlight = vi.fn();
    render(<SearchOnCanvas items={items} selectedNumber={null} onHighlight={onHighlight} />);
    open();
    fireEvent.change(screen.getByLabelText("Поиск объектов на схеме"), {
      target: { value: "теплиц" },
    });
    fireEvent.click(screen.getByText("Теплица"));
    expect(onHighlight).toHaveBeenCalledWith(3);
  });

  it("показывает «Ничего не нашлось» при отсутствии совпадений", () => {
    render(<SearchOnCanvas items={items} selectedNumber={null} onHighlight={vi.fn()} />);
    open();
    fireEvent.change(screen.getByLabelText("Поиск объектов на схеме"), {
      target: { value: "болото" },
    });
    expect(screen.getByText("Ничего не нашлось")).toBeTruthy();
  });
});
// Покрытие: разворачивание, фильтрация, подсветка, пустой результат.
