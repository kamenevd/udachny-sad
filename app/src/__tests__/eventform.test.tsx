/**
 * Тест EventForm — рендер с 12 типами, проверка спец-полей (задача 15.4)
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Мокаем PocketBase-обёртку journalEvents (создание/правка события)
vi.mock("../lib/pb", () => ({
  journalEvents: { create: vi.fn(), update: vi.fn() },
}));
// PhotoDiagnosis остаётся на Convex (задача C.7, ещё не мигрирован) → мокаем,
// реального ConvexProvider в тесте нет. PhotoGallery/PhotoUpload уже на
// PocketBase (задача C.6), но тоже мокаем — usePbCollection лезет в реальный
// pb.collection(...).subscribe(), которого в тесте нет.
vi.mock("../components/PhotoDiagnosis", () => ({
  PhotoDiagnosis: () => null,
}));
vi.mock("../components/PhotoGallery", () => ({
  PhotoGallery: () => null,
}));
vi.mock("../components/PhotoUpload", () => ({
  PhotoUpload: () => null,
}));

import { EventForm, EVENT_TYPES } from "../components/EventForm";
import { ToastProvider } from "../components/Toast";

/** EventForm использует useQueuedMutation → useToast(), нужен ToastProvider (задача 27.2) */
function renderForm(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

const baseProps = {
  open: true,
  plantingId: "planting-1" as never,
  onClose: vi.fn(),
  onSaved: vi.fn(),
};

describe("EventForm — типы событий", () => {
  it("содержит ровно 12 типов событий", () => {
    expect(EVENT_TYPES).toHaveLength(12);
  });

  it("рендерит все 12 кнопок типов при открытии", () => {
    renderForm(<EventForm {...baseProps} />);
    for (const t of EVENT_TYPES) {
      expect(screen.getByText(t.label)).toBeInTheDocument();
    }
  });

  it("заголовок модала — «Новая запись» при создании", () => {
    renderForm(<EventForm {...baseProps} />);
    expect(screen.getByText("Новая запись")).toBeInTheDocument();
  });

  it("заголовок модала — «Правка записи» при редактировании", () => {
    renderForm(
      <EventForm
        {...baseProps}
        event={
          {
            _id: "evt-1",
            eventType: "watering",
            eventDate: new Date().toISOString(),
          }
        }
      />,
    );
    expect(screen.getByText("Правка записи")).toBeInTheDocument();
  });
});

describe("EventForm — спец-поля урожая", () => {
  it("НЕ показывают harvest-поля при типе watering", () => {
    renderForm(<EventForm {...baseProps} />);
    expect(screen.queryByPlaceholderText("3")).toBeNull();
    expect(screen.queryByPlaceholderText("кг / вёдер / штук")).toBeNull();
  });

  it("показывают harvest-поля только при выборе harvest", () => {
    renderForm(<EventForm {...baseProps} />);
    fireEvent.click(screen.getByText("Урожай"));
    expect(screen.getByPlaceholderText("3")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("кг / вёдер / штук")).toBeInTheDocument();
  });

  it("harvest-поля скрываются при переключении на другой тип", () => {
    renderForm(<EventForm {...baseProps} />);
    fireEvent.click(screen.getByText("Урожай"));
    expect(screen.getByPlaceholderText("3")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Полив"));
    expect(screen.queryByPlaceholderText("3")).toBeNull();
  });
});

describe("EventForm — спец-поля болезни/вредителя", () => {
  it("показывают diagnosis при выборе Болезнь", () => {
    renderForm(<EventForm {...baseProps} />);
    fireEvent.click(screen.getByText("Болезнь"));
    expect(screen.getByPlaceholderText("Мучнистая роса")).toBeInTheDocument();
  });

  it("показывают diagnosis при выборе Вредитель", () => {
    renderForm(<EventForm {...baseProps} />);
    fireEvent.click(screen.getByText("Вредитель"));
    expect(screen.getByPlaceholderText("Тля")).toBeInTheDocument();
  });

  it("diagnosis НЕ показывается при типе Полив", () => {
    renderForm(<EventForm {...baseProps} />);
    expect(screen.queryByPlaceholderText("Мучнистая роса")).toBeNull();
    expect(screen.queryByPlaceholderText("Тля")).toBeNull();
  });
});
