/**
 * Тесты для утилит экспорта бэкапа в JSON (задача 31.3).
 */
import { describe, it, expect } from "vitest";
import { buildBackup, backupFileName, BACKUP_FORMAT_VERSION } from "../utils/exportJson";

describe("buildBackup", () => {
  it("оборачивает данные версией формата и датой экспорта", () => {
    const backup = buildBackup({
      gardens: [{ _id: "g1" }],
      schemaObjects: [],
      lightZones: [],
      moistureZones: [],
      plants: [],
      plantings: [],
      journalEvents: [],
    });
    expect(backup.formatVersion).toBe(BACKUP_FORMAT_VERSION);
    expect(typeof backup.exportedAt).toBe("number");
    expect(backup.gardens).toEqual([{ _id: "g1" }]);
  });
});

describe("backupFileName", () => {
  it("формирует имя файла с датой ГГГГ-ММ-ДД", () => {
    const name = backupFileName(new Date("2026-07-18T12:00:00Z"));
    expect(name).toBe("udachny-sad-backup-2026-07-18.json");
  });
});
