/**
 * Тест GuidedTour (задача 34.3)
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
    expect(screen.getByText("Шаг 1 из 3")).toBeTruthy();
  });

  it("проходит все три шага и завершается", () => {
    render(<GuidedTour />);
    fireEvent.click(screen.getByText("Дальше"));
    expect(screen.getByText("Нарисуйте схему")).toBeTruthy();
    fireEvent.click(screen.getByText("Дальше"));
    expect(screen.getByText("Посадите растение")).toBeTruthy();
    fireEvent.click(screen.getByText("Начать!"));
    expect(screen.queryByText("Посадите растение")).toBeNull();
    expect(localStorage.getItem("guided-tour-completed")).toBe("true");
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
});
