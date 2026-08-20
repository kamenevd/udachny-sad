/**
 * SeasonalTasksCard — блок «Что сделать сейчас» на главном экране
 * (PLAN13 этап 5).
 *
 * Сопоставляет текущий месяц со справочником пользователя (lib/seasonalTasks)
 * и показывает 1-3 сезонных дела. Данные тянет сам (best-effort): ошибка
 * загрузки или пустой справочник — карточка просто не рендерится, главный
 * экран от неё не зависит.
 */

import { useEffect, useState } from 'react';
import { plants as plantsApi, type Plant } from '../lib/pb';
import { getSeasonalTasks, type SeasonalTask } from '../lib/seasonalTasks';
import { MONTHS_RU_IN } from '../types/plant';

export function SeasonalTasksCard({ now = new Date() }: { now?: Date }) {
  const [plants, setPlants] = useState<Plant[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    plantsApi
      .list()
      .then((list) => {
        if (!cancelled) setPlants(list);
      })
      .catch(() => {
        // Сезонные советы — вторичная информация, ошибку не показываем.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const month = now.getMonth() + 1;
  const tasks: SeasonalTask[] = plants ? getSeasonalTasks(month, plants) : [];
  if (tasks.length === 0) return null;

  return (
    <section
      aria-label="Сезонные дела"
      className="rounded-[10px] border-2 border-ink bg-surface p-[5px] shadow-blank animate-fade-in-up motion-reduce:animate-none"
    >
      <div className="rounded-[6px] border border-ink p-4">
        <h2 className="mb-1 font-poster text-[15px] font-semibold uppercase tracking-[0.04em] text-ink">
          Что сделать в {MONTHS_RU_IN[month - 1]}
        </h2>
        <ul className="flex flex-col gap-2.5">
          {tasks.map((task) => (
            <li key={task.title} className="flex gap-2.5">
              <span aria-hidden="true" className="text-[20px] leading-[1.3]">
                {task.icon}
              </span>
              <div>
                <p className="text-[15px] font-medium leading-[1.35] text-ink">
                  {task.title}
                </p>
                <p className="text-[13px] leading-[1.4] text-ink-muted">
                  {task.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
