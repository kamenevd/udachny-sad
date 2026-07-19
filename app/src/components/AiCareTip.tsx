/**
 * AiCareTip — кнопка «Совет» в карточке посадки (задача 32.3).
 * Отправляет вид растения и журнал наблюдений в GLM (PocketBase AI-эндпоинт
 * `lib/ai.getCareTip`), показывает персональный совет по уходу.
 */

import { useState } from "react";
import { getCareTip } from "../lib/ai";
import { Button } from "./Button";

interface AiCareTipProps {
  plantingId: string;
}

export function AiCareTip({ plantingId }: AiCareTipProps) {
  const [tip, setTip] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    setLoading(true);
    setError("");
    try {
      setTip(await getCareTip(plantingId));
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
          🤖 Совет ИИ по уходу
        </p>
        {tip ? (
          <p className="text-[15px] leading-[1.5] text-ink">{tip}</p>
        ) : (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => void handleClick()}
            disabled={loading}
          >
            {loading ? "Спрашиваем…" : "Совет"}
          </Button>
        )}
        {error && <p className="mt-2 font-mono text-[13px] text-red">{error}</p>}
      </div>
    </div>
  );
}
