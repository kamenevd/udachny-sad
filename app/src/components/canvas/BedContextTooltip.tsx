/**
 * Задача H.2 — контекстный тултип грядки.
 *
 * Показывается при выборе грядки: освещённость и что росло в прошлом сезоне
 * (с болезнями, если были) — подсказка для севооборота. Данные грузятся из
 * истории места (loadBedContext). Пока грузится — «…», при отсутствии данных
 * тултип не мешает (короткая строка).
 */
import { useEffect, useState } from "react";
import {
  loadBedContext,
  type BedContext,
  type LightCondition,
} from "../../lib/bedContext";

interface BedContextTooltipProps {
  schemaObjectId: string;
  /** Условия освещённости пересекающих грядку зон. */
  conditions?: LightCondition[];
  className?: string;
}

export function BedContextTooltip({
  schemaObjectId,
  conditions = [],
  className = "",
}: BedContextTooltipProps) {
  const [ctx, setCtx] = useState<BedContext | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void loadBedContext(schemaObjectId, conditions)
      .then((c) => {
        if (alive) setCtx(c);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // conditions — массив из родителя; сериализуем для стабильности зависимостей.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaObjectId, conditions.join(",")]);

  if (loading) {
    return (
      <div className={`rounded-[8px] border-2 border-ink bg-paper px-3 py-2 font-mono text-[13px] text-ink-muted shadow-blank ${className}`}>
        Загружаем историю места…
      </div>
    );
  }

  if (!ctx || (!ctx.lightLabel && !ctx.lastSeason)) {
    return null;
  }

  return (
    <div
      role="tooltip"
      className={`flex flex-col gap-1 rounded-[8px] border-2 border-ink bg-paper px-3 py-2 text-[13px] text-ink shadow-blank ${className}`}
    >
      {ctx.lightLabel && (
        <p className="flex items-center gap-1.5">
          <span aria-hidden="true">☀️</span>
          <span>Освещённость: {ctx.lightLabel}</span>
        </p>
      )}
      {ctx.lastSeason && (
        <p className="flex items-start gap-1.5">
          <span aria-hidden="true">🕐</span>
          <span>
            {ctx.lastSeason.label}:{" "}
            {ctx.lastSeason.plants
              .map((pl) =>
                pl.diseases.length > 0
                  ? `${pl.plantName} (${pl.diseases.join(", ")})`
                  : pl.plantName,
              )
              .join("; ")}
          </span>
        </p>
      )}
    </div>
  );
}
