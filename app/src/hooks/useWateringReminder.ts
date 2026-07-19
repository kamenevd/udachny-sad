/**
 * useWateringReminder — предупреждение о долгом отсутствии полива (PLAN6 задача 35.3).
 *
 * Точка отсчёта — дата последнего события eventType="watering", а если
 * поливов ещё не было — дата посадки (plantedAt). Предупреждение показываем
 * только для активных посадок (status === "active"): для погибших/завершённых/
 * пересаженных полив уже не актуален.
 */
import { useMemo } from 'react';
import type { JournalEvent, PlantingStatus } from '../lib/pb';

export const WATERING_REMINDER_THRESHOLD_DAYS = 7;

export interface WateringReminder {
  shouldWarn: boolean;
  /** Сколько дней прошло с последнего полива (или с посадки, если поливов не было) */
  daysSinceWatering: number;
}

export function useWateringReminder(
  status: PlantingStatus | undefined,
  plantedAt: string | undefined,
  events: JournalEvent[] | undefined,
): WateringReminder {
  return useMemo(() => {
    if (status !== 'active' || !plantedAt || !events) {
      return { shouldWarn: false, daysSinceWatering: 0 };
    }

    const waterings = events.filter((e) => e.eventType === 'watering');
    const referenceTs =
      waterings.length > 0
        ? Math.max(...waterings.map((e) => new Date(e.eventDate).getTime()))
        : new Date(plantedAt).getTime();

    const daysSinceWatering = Math.floor((Date.now() - referenceTs) / (1000 * 60 * 60 * 24));
    return {
      shouldWarn: daysSinceWatering > WATERING_REMINDER_THRESHOLD_DAYS,
      daysSinceWatering,
    };
  }, [status, plantedAt, events]);
}
