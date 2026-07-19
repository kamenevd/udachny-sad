/**
 * Edge case тесты (задача 28.3): пустые строки, maxLength, NaN в ширине/длине.
 */
import { describe, it, expect } from "vitest";
import { validateGardenInput, GARDEN_NAME_MAX_LENGTH } from "../screens/Gardens";

describe("validateGardenInput — пустые строки", () => {
  it("пустое название — ошибка", () => {
    expect(validateGardenInput("", "10", "10")).toBe("Введите название участка");
  });

  it("название из одних пробелов — ошибка (trim)", () => {
    expect(validateGardenInput("   ", "10", "10")).toBe("Введите название участка");
  });

  it("пустая ширина — ошибка", () => {
    expect(validateGardenInput("Дача", "", "10")).toBe("Введите ширину в метрах");
  });

  it("пустая длина — ошибка", () => {
    expect(validateGardenInput("Дача", "10", "")).toBe("Введите длину в метрах");
  });
});

describe("validateGardenInput — NaN и некорректные числа в ширине/длине", () => {
  it("нечисловая ширина ('abc') — ошибка", () => {
    expect(validateGardenInput("Дача", "abc", "10")).toBe("Введите ширину в метрах");
  });

  it("нечисловая длина ('abc') — ошибка", () => {
    expect(validateGardenInput("Дача", "10", "xyz")).toBe("Введите длину в метрах");
  });

  it("ширина '0' — ошибка (не больше нуля)", () => {
    expect(validateGardenInput("Дача", "0", "10")).toBe("Введите ширину в метрах");
  });

  it("отрицательная длина — ошибка", () => {
    expect(validateGardenInput("Дача", "10", "-5")).toBe("Введите длину в метрах");
  });

  it("Infinity — ошибка (не конечное число)", () => {
    expect(validateGardenInput("Дача", "Infinity", "10")).toBe("Введите ширину в метрах");
  });

  it("NaN напрямую через пустую строку с пробелами — ошибка", () => {
    expect(validateGardenInput("Дача", "  ", "10")).toBe("Введите ширину в метрах");
  });
});

describe("validateGardenInput — maxLength названия", () => {
  it("название ровно на границе лимита — проходит", () => {
    const name = "a".repeat(GARDEN_NAME_MAX_LENGTH);
    expect(validateGardenInput(name, "10", "10")).toBeNull();
  });

  it("название длиннее лимита — ошибка", () => {
    const name = "a".repeat(GARDEN_NAME_MAX_LENGTH + 1);
    expect(validateGardenInput(name, "10", "10")).toBe("Слишком длинное название");
  });
});

describe("validateGardenInput — корректные данные", () => {
  it("валидные значения — null (нет ошибки)", () => {
    expect(validateGardenInput("Дача в Малинниках", "20", "30")).toBeNull();
  });

  it("дробные ширина/длина — валидны", () => {
    expect(validateGardenInput("Дача", "12.5", "8.25")).toBeNull();
  });
});
