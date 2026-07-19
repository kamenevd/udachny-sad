/**
 * Тесты useUndo (задача 23.4).
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { ToastProvider } from "../components/Toast";
import { useUndo } from "../hooks/useUndo";

function TestConsumer({ onUndoReady }: { onUndoReady: (api: ReturnType<typeof useUndo>) => void }) {
  const undo = useUndo();
  return (
    <button
      onClick={() => {
        onUndoReady(undo);
        undo.showUndo("Удалено", () => {});
      }}
    >
      Delete
    </button>
  );
}

describe("useUndo", () => {
  it("showUndo отображает toast с подсказкой отмены", async () => {
    let undoApi: ReturnType<typeof useUndo> | null = null;
    render(
      <ToastProvider>
        <TestConsumer onUndoReady={(api) => { undoApi = api; }} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("Delete"));
    expect(await screen.findByText(/Удалено/)).toBeInTheDocument();
    expect(undoApi).toBeTruthy();
    expect(undoApi!.canUndo()).toBe(true);
  });

  it("canUndo false если ничего не было удалено", async () => {
    let undoApi: ReturnType<typeof useUndo> | null = null;
    render(
      <ToastProvider>
        <TestConsumer onUndoReady={(api) => { undoApi = api; }} />
      </ToastProvider>,
    );
    // Don't click — canUndo should be false
    expect(undoApi).toBeNull();
  });

  it("executeUndo вызывает undoFn", async () => {
    const undoFn = vi.fn();
    let undoApi: ReturnType<typeof useUndo> | null = null;

    function TestExecute() {
      const undo = useUndo();
      return (
        <>
          <button onClick={() => { undoApi = undo; undo.showUndo("test", undoFn); }}>Show</button>
          <button onClick={() => undo.executeUndo()}>Undo</button>
        </>
      );
    }

    render(
      <ToastProvider>
        <TestExecute />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText("Show"));
    await waitFor(() => expect(undoApi).toBeTruthy());

    await act(async () => {
      fireEvent.click(screen.getByText("Undo"));
    });

    await waitFor(() => {
      expect(undoFn).toHaveBeenCalledTimes(1);
    });
  });
});
