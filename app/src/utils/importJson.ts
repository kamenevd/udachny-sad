/**
 * importJson — импорт бэкапа из JSON-файла (задача 31.4).
 * Валидирует файл, созданный exportJson.ts, перед отправкой в Convex
 * mutation backup.restoreFromBackup.
 */

import { BACKUP_FORMAT_VERSION, type BackupData } from "./exportJson";

const REQUIRED_ARRAYS: (keyof BackupData)[] = [
  "gardens",
  "schemaObjects",
  "lightZones",
  "moistureZones",
  "plants",
  "plantings",
  "journalEvents",
];

/** Разбирает и проверяет содержимое файла бэкапа */
export function parseBackupFile(text: string): BackupData {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("Повреждённый файл бэкапа: не удалось разобрать JSON");
  }

  if (typeof raw !== "object" || raw === null) {
    throw new Error("Повреждённый файл бэкапа: ожидался объект");
  }

  const data = raw as Record<string, unknown>;

  if (data.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new Error("Неподдерживаемая версия формата бэкапа");
  }

  for (const key of REQUIRED_ARRAYS) {
    if (!Array.isArray(data[key])) {
      throw new Error("Повреждённый файл бэкапа: отсутствуют данные");
    }
  }

  return data as unknown as BackupData;
}

/** Читает файл бэкапа, выбранный пользователем, и возвращает проверенные данные */
export function readBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(parseBackupFile(String(reader.result ?? "")));
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Не удалось прочитать файл бэкапа"));
      }
    };
    reader.onerror = () => reject(new Error("Не удалось прочитать файл бэкапа"));
    reader.readAsText(file);
  });
}
