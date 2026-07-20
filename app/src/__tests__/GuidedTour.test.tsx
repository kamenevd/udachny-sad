/**
 * Тест GuidedTour (задача 34.3; PLAN12 задача 12 — 5 шагов, возврат назад).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { GuidedTour } from "../components/GuidedTour";

describe("GuidedTour", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("показывает первый шаг при первом входе", () => {
    render(<GuidedTour />);
    expect(screen.getByText("Создайте участок")).toBeTruthy();
    expect(screen.getByText("Шаг 1 из 5")).toBeTruthy();
  });

  it("проходит все пять шагов и завершается", () => {
    render(<GuidedTour />);
    fireEvent.click(screen.getByText("Дальше"));
    expect(screen.getByText("Нарисуйте схему")).toBeTruthy();
    fireEvent.click(screen.getByText("Дальше"));
    expect(screen.getByText("Посадите растение")).toBeTruthy();
    fireEvent.click(screen.getByText("Дальше"));
    expect(screen.getByText("Смотрите по сезонам")).toBeTruthy();
    fireEvent.click(screen.getByText("Дальше"));
    expect(screen.getByText("Спросите совета")).toBeTruthy();
    fireEvent.click(screen.getByText("Начать!"));
    expect(screen.queryByText("Спросите совета")).toBeNull();
    expect(localStorage.getItem("guided-tour-completed")).toBe("true");
  });

  it("кнопка «Назад» возвращает к предыдущему шагу", () => {
    render(<GuidedTour />);
    // На первом шаге возвращаться некуда
    expect(screen.queryByText("Назад")).toBeNull();

    fireEvent.click(screen.getByText("Дальше"));
    expect(screen.getByText("Шаг 2 из 5")).toBeTruthy();

    fireEvent.click(screen.getByText("Назад"));
    expect(screen.getByText("Создайте участок")).toBeTruthy();
    expect(screen.getByText("Шаг 1 из 5")).toBeTruthy();
  });

  it("на последнем шаге «Пропустить» уступает место кнопке «Начать!»", () => {
    render(<GuidedTour />);
    for (let i = 0; i < 4; i += 1) fireEvent.click(screen.getByText("Дальше"));
    expect(screen.queryByText("Пропустить")).toBeNull();
    expect(screen.getByText("Начать!")).toBeTruthy();
  });

  it("не показывается повторно после прохождения", () => {
    localStorage.setItem("guided-tour-completed", "true");
    const { container } = render(<GuidedTour />);
    expect(container.firstChild).toBeNull();
  });

  it("кнопка «Пропустить» закрывает тур и ставит флаг", () => {
    render(<GuidedTour />);
    fireEvent.click(screen.getByText("Пропустить"));
    expect(screen.queryByText("Создайте участок")).toBeNull();
    expect(localStorage.getItem("guided-tour-completed")).toBe("true");
  });

  it("шаг с подсветкой открывается, даже если якорь есть на странице", () => {
    const anchor = document.createElement("div");
    anchor.setAttribute("data-tour", "editor-modes");
    document.body.appendChild(anchor);

    render(<GuidedTour />);
    fireEvent.click(screen.getByText("Дальше"));
    // jsdom отдаёт нулевые размеры, поэтому рамка не рисуется — важно, что
    // шаг с highlight не падает и показывается как обычно.
    expect(screen.getByText("Нарисуйте схему")).toBeTruthy();

    anchor.remove();
  });
});
