/**
 * WateringBanner — умное напоминание о поливе (PLAN9 задача J.2).
 *
 * Показывается, когда для активной посадки полив не записывали дольше порога
 * (`useWateringReminder`, порог 7 дней). Текст персонализирован названием
 * растения: «Флоксы не поливали 8 дней». Компонент сам решает, показываться
 * ли — если предупреждать не о чем, рендерит `null`.
 */
import { pluralizeDays } from './Banner';

interface WateringBannerProps {
  /** Показывать ли баннер (из `useWateringReminder.shouldWarn`). */
  show: boolean;
  /** Сколько дней без полива. */
  days: number;
  /** Название растения для персонализации; при отсутствии — общий текст. */
  plantName?: string;
}

export function WateringBanner({ show, days, plantName }: WateringBannerProps) {
  if (!show) return null;

  const subject = plantName?.trim() || 'Посадку';
  const daysWord = pluralizeDays(days).toLowerCase();

  return (
    <div
      role="status"
      className="rounded-[10px] border-2 border-red bg-red/10 p-3"
    >
      <p className="font-mono text-[15px] text-red">
        💧 {subject} не поливали {days} {daysWord}
      </p>
    </div>
  );
}

export default WateringBanner;
