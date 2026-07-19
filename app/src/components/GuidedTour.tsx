/**
 * GuidedTour — приветственный онбординг для нового пользователя (задача 34.3).
 *
 * Показывает при первом входе 3 ключевых шага работы с приложением:
 *   1. Создать участок
 *   2. Нарисовать схему
 *   3. Посадить растение
 *
 * Полноэкранный модальный тур с точками-навигацией. Показывается один раз —
 * после прохождения или пропуска ставит localStorage-флаг и больше не всплывает.
 * Бумажный стиль DESIGN.md.
 *
 * Использование:
 *   <GuidedTour />   // на экране Gardens (точка входа)
 */

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'guided-tour-completed';

interface TourStep {
  icon: string;
  title: string;
  text: string;
}

const STEPS: TourStep[] = [
  {
    icon: '🏡',
    title: 'Создайте участок',
    text: 'Создайте свой декоративный сад — укажите название и размеры. С него начинается всё остальное.',
  },
  {
    icon: '✏️',
    title: 'Нарисуйте схему',
    text: 'Разместите дом, клумбы и декоративные деревья на плане. Отметьте, где солнце, а где тень — так удобнее планировать посадки.',
  },
  {
    icon: '🌱',
    title: 'Посадите растение',
    text: 'Тапните по клумбе и выберите растение из справочника. Дальше — ведите журнал: полив, цветение, обрезка.',
  },
];

interface GuidedTourProps {
  /** Форсировать показ (для повторного вызова «Как это работает?»), игнорируя флаг */
  force?: boolean;
  /** Коллбэк после закрытия — например, сбросить force-режим */
  onClose?: () => void;
}

export function GuidedTour({ force = false, onClose }: GuidedTourProps) {
  const [visible, setVisible] = useState(() => {
    if (force) return true;
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'true';
    } catch {
      return true;
    }
  });
  const [step, setStep] = useState(0);

  // Если force включили после монтирования — открыть тур заново.
  useEffect(() => {
    if (force) {
      setStep(0);
      setVisible(true);
    }
  }, [force]);

  if (!visible) return null;

  const finish = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // приватный режим — просто закрываем
    }
    setVisible(false);
    onClose?.();
  };

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Знакомство с приложением"
    >
      <div className="w-full max-w-sm rounded-[10px] border-2 border-ink bg-paper p-[5px] shadow-blank">
        <div className="rounded-[6px] border border-ink p-6 text-center">
          {/* Индикатор прогресса */}
          <div className="mb-5 flex justify-center gap-2" aria-hidden="true">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={[
                  'h-2 rounded-full transition-all',
                  i === step ? 'w-6 bg-ink' : 'w-2 bg-ink/25',
                ].join(' ')}
              />
            ))}
          </div>

          <div className="mb-4 text-[56px]" aria-hidden="true">
            {current.icon}
          </div>
          <p className="mb-1 font-mono text-[13px] uppercase tracking-[0.08em] text-ink-muted">
            Шаг {step + 1} из {STEPS.length}
          </p>
          <h2 className="mb-3 font-poster text-[22px] font-semibold uppercase tracking-[0.03em] text-ink">
            {current.title}
          </h2>
          <p className="mb-6 text-[16px] leading-[1.5] text-ink">{current.text}</p>

          <button
            type="button"
            onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
            className="mb-2 h-[44px] w-full rounded-lg border-2 border-ink bg-ink px-4 font-poster text-[14px] font-semibold uppercase tracking-[0.04em] text-paper transition-all duration-75 active:translate-y-[1px]"
          >
            {isLast ? 'Начать!' : 'Дальше'}
          </button>
          {!isLast && (
            <button
              type="button"
              onClick={finish}
              className="h-[40px] w-full font-mono text-[14px] text-ink-muted transition-colors hover:text-ink"
            >
              Пропустить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
