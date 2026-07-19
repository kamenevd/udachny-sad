/**
 * Тест useSwipe (задача 34.1)
 */
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { useSwipe } from "../hooks/useSwipe";

function touch(x: number, y: number) {
  return { clientX: x, clientY: y } as Touch;
}

function SwipeArea({
  onSwipeLeft,
  onSwipeRight,
}: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}) {
  const ref = useSwipe<HTMLDivElement>({ onSwipeLeft, onSwipeRight });
  return <div ref={ref} data-testid="swipe-area" style={{ width: 300, height: 300 }} />;
}

describe("useSwipe", () => {
  it("свайп влево вызывает onSwipeLeft", () => {
    const onSwipeLeft = vi.fn();
    const { getByTestId } = render(<SwipeArea onSwipeLeft={onSwipeLeft} />);
    const el = getByTestId("swipe-area");

    fireEvent.touchStart(el, { touches: [touch(200, 100)] });
    fireEvent.touchEnd(el, { changedTouches: [touch(100, 100)] });

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
  });

  it("свайп вправо вызывает onSwipeRight", () => {
    const onSwipeRight = vi.fn();
    const { getByTestId } = render(<SwipeArea onSwipeRight={onSwipeRight} />);
    const el = getByTestId("swipe-area");

    fireEvent.touchStart(el, { touches: [touch(100, 100)] });
    fireEvent.touchEnd(el, { changedTouches: [touch(200, 100)] });

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it("короткое движение ниже порога не считается свайпом", () => {
    const onSwipeLeft = vi.fn();
    const { getByTestId } = render(<SwipeArea onSwipeLeft={onSwipeLeft} />);
    const el = getByTestId("swipe-area");

    fireEvent.touchStart(el, { touches: [touch(200, 100)] });
    fireEvent.touchEnd(el, { changedTouches: [touch(180, 100)] });

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it("преимущественно вертикальное движение не считается свайпом", () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const { getByTestId } = render(
      <SwipeArea onSwipeLeft={onSwipeLeft} onSwipeRight={onSwipeRight} />,
    );
    const el = getByTestId("swipe-area");

    fireEvent.touchStart(el, { touches: [touch(150, 50)] });
    fireEvent.touchEnd(el, { changedTouches: [touch(100, 250)] });

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });
});
