/**
 * Тест Modal — focus trap, восстановление фокуса (задача 19.2)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Modal } from "../components/Modal";

beforeEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

afterEach(() => {
  cleanup();
});

describe("Modal — focus trap", () => {
  it("не рендерится когда open=false", () => {
    render(
      <Modal open={false} title="T" onConfirm={() => {}} onCancel={() => {}}>
        content
      </Modal>,
    );
    expect(screen.queryByText("T")).toBeNull();
  });

  it("имеет role=dialog и aria-modal=true", () => {
    render(
      <Modal open title="Тест" onConfirm={() => {}} onCancel={() => {}}>
        body
      </Modal>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
  });

  it("устанавливает фокус на первый фокусируемый элемент при открытии", async () => {
    render(
      <Modal open title="Т" onConfirm={() => {}} onCancel={() => {}}>
        body
      </Modal>,
    );
    // Первый фокусируемый — кнопка «Отмена» (по порядку в DOM)
    await new Promise((r) => setTimeout(r, 10));
    const cancelBtn = screen.getByText("Отмена");
    expect(document.activeElement).toBe(cancelBtn);
  });

  it("Tab на последнем элементе переносит фокус на первый (цикл)", async () => {
    render(
      <Modal open title="T" onConfirm={() => {}} onCancel={() => {}}>
        body
      </Modal>,
    );
    await new Promise((r) => setTimeout(r, 10));
    const confirmBtn = screen.getByText("Да");
    const cancelBtn = screen.getByText("Отмена");
    confirmBtn.focus();
    expect(document.activeElement).toBe(confirmBtn);
    // Tab на последнем → focus должен перейти на первый
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab" });
    expect(document.activeElement).toBe(cancelBtn);
  });

  it("Shift+Tab на первом элементе переносит фокус на последний", async () => {
    render(
      <Modal open title="T" onConfirm={() => {}} onCancel={() => {}}>
        body
      </Modal>,
    );
    await new Promise((r) => setTimeout(r, 10));
    const cancelBtn = screen.getByText("Отмена");
    const confirmBtn = screen.getByText("Да");
    cancelBtn.focus();
    fireEvent.keyDown(screen.getByRole("dialog"), {
      key: "Tab",
      shiftKey: true,
    });
    expect(document.activeElement).toBe(confirmBtn);
  });

  it("Escape закрывает модал (onCancel)", () => {
    const onCancel = vi.fn();
    render(
      <Modal open title="T" onConfirm={() => {}} onCancel={onCancel}>
        body
      </Modal>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalled();
  });

  it("блокирует скролл body при открытии", () => {
    render(
      <Modal open title="T" onConfirm={() => {}} onCancel={() => {}}>
        body
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("восстанавливает overflow при закрытии", () => {
    const { rerender } = render(
      <Modal open title="T" onConfirm={() => {}} onCancel={() => {}}>
        body
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("hidden");
    rerender(
      <Modal open={false} title="T" onConfirm={() => {}} onCancel={() => {}}>
        body
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("");
  });
});
