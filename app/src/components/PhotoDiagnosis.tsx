/**
 * PhotoDiagnosis — кнопка «Что это?» для событий болезни/вредителя (задача 32.2).
 * Берёт последнее фото записи журнала (PocketBase), отправляет в GLM-vision
 * (PocketBase AI-эндпоинт `lib/ai.diagnosePhoto`), показывает диагноз и
 * позволяет подставить его в поле формы.
 */

import { useState } from "react";
import { photos as photosApi, photoUrl, type Photo } from "../lib/pb";
import { usePbCollection } from "../hooks/usePbCollection";
import { diagnosePhoto } from "../lib/ai";

const chipButtonClass =
  "w-full rounded-[8px] border-2 border-ink bg-paper px-3 py-2 font-poster text-[13px] uppercase tracking-[0.03em] text-ink transition-colors hover:bg-ink/10 disabled:opacity-50";

interface PhotoDiagnosisProps {
  journalEventId: string;
  /** Текущая заметка-диагноз из формы — передаётся в GLM как подсказка */
  note?: string;
  /** Вызывается с текстом диагноза при нажатии «Заполнить» */
  onApply?: (diagnosis: string) => void;
}

export function PhotoDiagnosis({ journalEventId, note, onApply }: PhotoDiagnosisProps) {
  const { data: photos } = usePbCollection<Photo>(
    photosApi,
    `ownerType="journalEvent" && ownerId="${journalEventId}"`,
  );

  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Нет фото — нечего анализировать
  if (!photos || photos.length === 0) return null;

  const latestPhoto = photos[photos.length - 1];
  const latestUrl = photoUrl(latestPhoto);
  if (!latestUrl) return null;

  const handleClick = async () => {
    setLoading(true);
    setError("");
    try {
      setDiagnosis(await diagnosePhoto(latestUrl, note));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не получилось распознать фото");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[8px] border border-ink/30 bg-paper p-3">
      <p className="mb-2 font-mono text-[13px] text-ink-muted">🤖 Диагностика по фото</p>
      {diagnosis ? (
        <>
          <p className="text-[14px] leading-[1.5] text-ink">{diagnosis}</p>
          {onApply && (
            <button
              type="button"
              className={`mt-2 ${chipButtonClass}`}
              onClick={() => onApply(diagnosis)}
            >
              Подставить в диагноз
            </button>
          )}
        </>
      ) : (
        <button
          type="button"
          className={chipButtonClass}
          onClick={() => void handleClick()}
          disabled={loading}
        >
          {loading ? "Распознаём…" : "Что это?"}
        </button>
      )}
      {error && <p className="mt-2 font-mono text-[13px] text-red">{error}</p>}
    </div>
  );
}
