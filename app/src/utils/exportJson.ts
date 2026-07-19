/**
 * exportJson — экспорт всех данных пользователя в JSON-файл (задача 31.3).
 * Бэкап: участки, объекты схемы, зоны, растения, посадки, журнал событий.
 * Формат совместим с importJson.ts (задача 31.4).
 */

export const BACKUP_FORMAT_VERSION = 1;

export interface BackupData {
  formatVersion: number;
  exportedAt: number;
  gardens: unknown[];
  schemaObjects: unknown[];
  lightZones: unknown[];
  moistureZones: unknown[];
  plants: unknown[];
  plantings: unknown[];
  journalEvents: unknown[];
}

/** Оборачивает сырые данные экспорта конвертом с версией формата и датой */
export function buildBackup(data: {
  gardens: unknown[];
  schemaObjects: unknown[];
  lightZones: unknown[];
  moistureZones: unknown[];
  plants: unknown[];
  plantings: unknown[];
  journalEvents: unknown[];
}): BackupData {
  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    exportedAt: Date.now(),
    ...data,
  };
}

/** Имя файла бэкапа с датой в формате ГГГГ-ММ-ДД */
export function backupFileName(now: Date = new Date()): string {
  const iso = now.toISOString().slice(0, 10);
  return `udachny-sad-backup-${iso}.json`;
}

/** Скачивает бэкап как .json-файл через временную ссылку */
export function downloadBackup(data: BackupData, fileName = backupFileName()): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
