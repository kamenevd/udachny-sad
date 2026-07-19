/**
 * Тест OfflineBanner — рендер при offline/online, проверка role=alert (задача 15.3)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { OfflineBanner } from "../components/OfflineBanner";

beforeEach(() => {
  cleanup();
  // по умолчанию онлайн
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: true,
  });
});

describe("OfflineBanner", () => {
  it("скрыт когда онлайн и нет ошибки", () => {
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("видим когда navigator.onLine = false", () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });
    render(<OfflineBanner />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/Нет интернета/)).toBeInTheDocument();
  });

  it("видим при внешней ошибке onError", () => {
    render(<OfflineBanner onError={new Error("convex down")} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/Нет связи с дачей/)).toBeInTheDocument();
  });

  it("role=alert + aria-live=assertive для скринридеров", () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });
    render(<OfflineBanner />);
    const banner = screen.getByRole("alert");
    expect(banner.getAttribute("aria-live")).toBe("assertive");
  });

  it("показывает кнопку Повторить только при внешней ошибке + onClearError", () => {
    render(
      <OfflineBanner
        onError={new Error("test")}
        onClearError={() => {}}
      />
    );
    expect(screen.getByText("Повторить")).toBeInTheDocument();
  });

  it("НЕ показывает кнопку Повторить в режиме browser-offline", () => {
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: false,
    });
    render(<OfflineBanner onClearError={() => {}} />);
    expect(screen.queryByText("Повторить")).toBeNull();
  });
});
