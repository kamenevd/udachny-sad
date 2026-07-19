/**
 * Integration тест Gardens — создание → список, через mock-store (задача 28.2,
 * обновлён в C.2 под миграцию экрана на PocketBase).
 *
 * Мокаем ../lib/pb (crud-обёртки gardens.*), ../lib/pbStats и ../lib/pbBackup
 * так, чтобы список участков был по-настоящему реактивным на действия экрана
 * (Gardens.tsx сам перечитывает список после create/remove через loadGardens()).
 * Проверяется полный flow: пустой список → форма создания → участок появляется
 * в списке без перезагрузки страницы.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

interface MockGarden {
  id: string;
  name: string;
  boundary?: { points: number[][] };
}

const { mockState, mockCreateGarden, mockRemoveGardenCascade, mockLogout } = vi.hoisted(() => {
  const state: { gardens: MockGarden[] } = { gardens: [] };
  return {
    mockState: state,
    mockCreateGarden: vi.fn(
      async (data: { name: string; boundary?: { points: number[][] } }) => {
        const id = `g${state.gardens.length + 1}`;
        const garden: MockGarden = { id, name: data.name, boundary: data.boundary };
        state.gardens = [...state.gardens, garden];
        return garden;
      },
    ),
    mockRemoveGardenCascade: vi.fn(async (gardenId: string) => {
      state.gardens = state.gardens.filter((g) => g.id !== gardenId);
    }),
    mockLogout: vi.fn(),
  };
});

vi.mock("../lib/pb", () => ({
  pb: { authStore: { record: { id: "u1" } } },
  gardens: {
    list: vi.fn(async () => mockState.gardens),
    create: (...args: [{ name: string; boundary?: { points: number[][] } }]) =>
      mockCreateGarden(...args),
  },
}));

vi.mock("../lib/auth", () => ({
  logout: mockLogout,
}));

vi.mock("../lib/pbStats", () => ({
  getStreakForGardens: vi.fn(async () => ({ days: 0, hasToday: false })),
}));

vi.mock("../lib/pbBackup", () => ({
  getFullExport: vi.fn(async () => ({
    gardens: [],
    schemaObjects: [],
    lightZones: [],
    moistureZones: [],
    plants: [],
    plantings: [],
    journalEvents: [],
  })),
  restoreFromBackup: vi.fn(),
  removeGardenCascade: (...args: [string]) => mockRemoveGardenCascade(...args),
}));

import { Gardens } from "../screens/Gardens";
import { ToastProvider } from "../components/Toast";

function renderGardens() {
  return render(
    <ToastProvider>
      <Gardens onSelectGarden={vi.fn()} onOpenPlants={vi.fn()} onOpenDashboard={vi.fn()} />
    </ToastProvider>,
  );
}

beforeEach(() => {
  mockState.gardens = [];
  mockCreateGarden.mockClear();
  mockRemoveGardenCascade.mockClear();
});

describe("Gardens — flow создание → список", () => {
  it("пустой список показывает призыв добавить первый участок", async () => {
    renderGardens();
    await waitFor(() =>
      expect(screen.getByText(/Ни одного цветка без записи/)).toBeInTheDocument(),
    );
  });

  it("валидация — пустое имя не создаёт участок", async () => {
    renderGardens();
    await waitFor(() => screen.getByText("+ Добавить участок"));
    fireEvent.click(screen.getByText("+ Добавить участок"));
    fireEvent.click(screen.getByText("Создать"));
    await waitFor(() =>
      expect(screen.getByText("Введите название участка")).toBeInTheDocument(),
    );
    expect(mockCreateGarden).not.toHaveBeenCalled();
  });

  it("создание участка добавляет его в список без перезагрузки", async () => {
    renderGardens();

    await waitFor(() => screen.getByText("+ Добавить участок"));
    fireEvent.click(screen.getByText("+ Добавить участок"));
    fireEvent.change(screen.getByLabelText("Название"), {
      target: { value: "Дача в Малинниках" },
    });
    fireEvent.change(screen.getByLabelText("Ширина, м"), {
      target: { value: "20" },
    });
    fireEvent.change(screen.getByLabelText("Длина, м"), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByText("Создать"));

    await waitFor(() =>
      expect(screen.getByText("Дача в Малинниках")).toBeInTheDocument(),
    );
    expect(mockCreateGarden).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Дача в Малинниках" }),
    );
    // Пустое состояние должно уйти
    expect(screen.queryByText(/Ни одного цветка без записи/)).toBeNull();
    // Тост об успехе
    await waitFor(() =>
      expect(screen.getByText("Участок добавлен")).toBeInTheDocument(),
    );
  });

  it("удаление участка убирает его из списка", async () => {
    mockState.gardens = [{ id: "g1", name: "Старая дача" }];
    renderGardens();
    await waitFor(() => expect(screen.getByText("Старая дача")).toBeInTheDocument());

    fireEvent.click(screen.getByLabelText("Удалить участок"));
    fireEvent.click(screen.getByText("Списать"));

    await waitFor(() =>
      expect(screen.queryByText("Старая дача")).toBeNull(),
    );
    expect(mockRemoveGardenCascade).toHaveBeenCalledWith("g1");
  });
});
