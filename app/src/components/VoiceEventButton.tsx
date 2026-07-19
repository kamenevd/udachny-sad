/**
 * Задача G.2 — голосовой ввод события журнала.
 *
 * Кнопка «🎤 Голосом»: слушает фразу садовода («полил розы»), угадывает
 * тип события по ключевому глаголу и отдаёт остаток фразы как заметку —
 * `{ eventType: 'watering', note: 'розы' }`. Если Web Speech API не
 * поддерживается — кнопка не рендерится (фоллбэк на ручной ввод EventForm).
 */
import { useEffect } from "react";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

export interface ParsedVoiceEvent {
  eventType: string;
  note: string;
}

/** Ключевые слова → тип события. Порядок важен: сначала более специфичные. */
const KEYWORDS: { type: string; words: string[] }[] = [
  { type: "watering", words: ["полил", "полила", "полив", "поливаю", "поливал"] },
  { type: "fertilizing", words: ["подкорм", "удобр", "внёс", "внес"] },
  { type: "pruning", words: ["обрезал", "обрезала", "обрезка", "подрезал", "подстриг", "подстригла"] },
  { type: "transplant", words: ["пересадил", "пересадила", "пересадка"] },
  { type: "planting", words: ["посадил", "посадила", "посеял", "посеяла", "посадка"] },
  { type: "blooming", words: ["зацвело", "распустилось", "цветет", "цветёт", "отцвело", "цвет", "зацвел", "расцвел"] },
  { type: "winterizing", words: ["укрыл", "укрыла", "укрытие", "утеплил"] },
  { type: "disease", words: ["болезн", "заболел", "роса", "гниль", "пятн"] },
  { type: "pest", words: ["вредител", "тля", "жук", "гусениц", "слизн"] },
  { type: "death", words: ["погиб", "засох", "пропал", "вымерз"] },
];

/**
 * Разбирает распознанную фразу в тип события + заметку.
 * Тип — по первому совпавшему ключевому слову; заметка — исходная фраза без
 * этого слова (если ничего не совпало — тип "other", вся фраза в заметку).
 */
export function parseVoiceEvent(transcript: string): ParsedVoiceEvent {
  const text = transcript.trim();
  const lower = text.toLowerCase();

  for (const { type, words } of KEYWORDS) {
    const hit = words.find((w) => lower.includes(w));
    if (hit) {
      // Вырезаем совпавшее слово целиком (по границе) из заметки.
      const note = text
        .replace(new RegExp(`\\S*${hit}\\S*`, "iu"), "")
        .replace(/\s+/g, " ")
        .trim();
      return { eventType: type, note };
    }
  }
  return { eventType: "other", note: text };
}

interface VoiceEventButtonProps {
  onResult: (parsed: ParsedVoiceEvent) => void;
  className?: string;
}

export function VoiceEventButton({ onResult, className = "" }: VoiceEventButtonProps) {
  const { supported, listening, transcript, error, start, stop } = useSpeechRecognition("ru-RU");

  // Когда распознавание завершилось и есть текст — парсим и отдаём наверх.
  useEffect(() => {
    if (!listening && transcript) {
      onResult(parseVoiceEvent(transcript));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening, transcript]);

  if (!supported) return null;

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <button
        type="button"
        onClick={listening ? stop : start}
        aria-pressed={listening}
        className={[
          "flex h-[48px] items-center justify-center gap-2 rounded-[8px] border-2 border-ink px-3",
          "font-poster text-[14px] font-semibold uppercase tracking-[0.03em]",
          listening ? "animate-pulse bg-red text-white" : "bg-surface text-ink hover:bg-ink/10",
        ].join(" ")}
      >
        <span aria-hidden="true">🎤</span>
        {listening ? "Слушаю… (нажмите чтобы остановить)" : "Голосом"}
      </button>
      {listening && transcript && (
        <p className="font-mono text-[13px] text-ink-muted">«{transcript}»</p>
      )}
      {error && error !== "not-supported" && (
        <p className="font-mono text-[13px] text-red">Не расслышал, попробуйте ещё раз</p>
      )}
    </div>
  );
}
