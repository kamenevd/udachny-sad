/**
 * ExportPng — кнопка «Сохранить картинку» в шапке GardenDetail (задача 31.1).
 * Рендерит текущее состояние Konva Stage в PNG через stage.toDataURL()
 * и скачивает файл — офлайн-friendly (`toDataURL`, без запроса к серверу).
 */

import type { RefObject } from 'react';
import type Konva from 'konva';

interface ExportPngProps {
  stageRef: RefObject<Konva.Stage | null>;
  gardenName: string;
  className?: string;
}

/** Имя файла из названия участка: транслит не нужен, ФС Ok с кириллицей */
function fileNameFor(gardenName: string): string {
  const safe = gardenName.trim().replace(/[\\/:*?"<>|]/g, '-') || 'участок';
  return `${safe}.png`;
}

export function ExportPng({ stageRef, gardenName, className }: ExportPngProps) {
  const handleExport = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const dataUrl = stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = fileNameFor(gardenName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      aria-label="Сохранить картинку схемы"
      className={className ?? 'shrink-0 cursor-pointer'}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="M7 10l5 5 5-5" />
        <path d="M12 15V3" />
      </svg>
    </button>
  );
}
