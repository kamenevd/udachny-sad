/**
 * Тесты для утилит импорта бэкапа из JSON (задача 31.4).
 */
import { describe, it, expect } from "vitest";
import { parseBackupFile } from "../utils/importJson";
import { buildBackup } from "../utils/exportJson";

const validBackup = buildBackup({
  gardens: [{ _id: "g1" }],
  schemaObjects: [],
  lightZones: [],
  moistureZones: [],
  plants: [],
  plantings: [],
  journalEvents: [],
});

describe("parseBackupFile", () => {
  it("разбирает корректный файл бэкапа", () => {
    const parsed = parseBackupFile(JSON.stringify(validBackup));
    expect(parsed.gardens).toEqual([{ _id: "g1" }]);
    expect(parsed.formatVersion).toBe(validBackup.formatVersion);
  });

  it("бросает ошибку на невалидный JSON", () => {
    expect(() => parseBackupFile("не json")).toThrow(/Повреждённый файл/);
  });

  it("бросает ошибку на неподдерживаемую версию формата", () => {
    const bad = { ...validBackup, formatVersion: 999 };
    expect(() => parseBackupFile(JSON.stringify(bad))).toThrow(/версия формата/);
  });

  it("бросает ошибку, если отсутствуют обязательные массивы", () => {
    const { gardens: _gardens, ...rest } = validBackup;
    expect(() => parseBackupFile(JSON.stringify(rest))).toThrow(/Повреждённый файл/);
  });
});
