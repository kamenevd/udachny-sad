/**
 * AiAdvice — кнопка «Что посадить тут?» (задача 32.1).
 * Отправляет историю посадок места в GLM (PocketBase AI-эндпоинт
 * `lib/ai.getPlaceAdvice`), показывает рекомендацию агронома-ИИ.
 */

import { useState } from "react";
import { getPlaceAdvice } from "../lib/ai";
import { Button } from "./Button";

interface AiAdviceProps {
  schemaObjectId: string;
}

export function AiAdvice({ schemaObjectId }: AiAdviceProps) {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    setLoading(true);
    setError("");
    try {
      setAdvice(await getPlaceAdvice(schemaObjectId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не получилось получить совет");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[10px] border-2 border-ink bg-surface p-[5px] shadow-blank">
      <div className="rounded-[6px] border border-ink p-4">
        <p className="mb-3 font-poster text-[13px] uppercase tracking-[0.05em] text-ink-muted">
          🤖 Совет ИИ-агронома
        </p>
        {advice ? (
          <p className="text-[15px] leading-[1.5] text-ink">{advice}</p>
        ) : (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => void handleClick()}
            disabled={loading}
          >
            {loading ? "Спрашиваем…" : "Что посадить тут?"}
          </Button>
        )}
        {error && <p className="mt-2 font-mono text-[13px] text-red">{error}</p>}
      </div>
    </div>
  );
}
