/**
 * Тесты Toast + useSafeMutation (задача 8.3).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ToastProvider, useToast } from "../components/Toast";

/** Тестовый компонент, использующий useToast. */
function TestConsumer() {
  const { showToast } = useToast();
  return (
    <button onClick={() => showToast("Тестовая ошибка", "error")}>
      Показать toast
    </button>
  );
}

describe("Toast", () => {
  it("ToastProvider рендерит children", () => {
    render(
      <ToastProvider>
        <p>Привет</p>
      </ToastProvider>,
    );
    expect(screen.getByText("Привет")).toBeInTheDocument();
  });

  it("showToast отображает toast с сообщением", async () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Показать toast"));
    expect(await screen.findByText("Тестовая ошибка")).toBeInTheDocument();
  });

  it("toast имеет role=alert для a11y", async () => {
    render(
      <ToastProvider>
        <TestConsumer />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Показать toast"));
    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("Тестовая ошибка");
    });
  });

  it("useToast бросает ошибку вне провайдера", () => {
    // Скрыть console.error для этого теста
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function BadConsumer() {
      useToast();
      return null;
    }
    expect(() => render(<BadConsumer />)).toThrow(
      /должен использоваться внутри/,
    );
    spy.mockRestore();
  });
});
