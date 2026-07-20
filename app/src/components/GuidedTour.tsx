/**
 * GuidedTour — приветственный онбординг для нового пользователя (задача 34.3).
 *
 * PLAN12 задача 12: тур доведён с 3 до 5 шагов — добавлены контекстные шаги по
 * канвасу (режимы редактора, объекты и сезонность), появился прогресс-бар,
 * возврат к предыдущему шагу и подсветка элемента, о котором идёт речь.
 *
 * Подсветка: у шага может быть `highlight` — CSS-селектор реального элемента
 * на экране. Если элемент найден, поверх него рисуется рамка (по его
 * getBoundingClientRect), поэтому подсказка привязана к тому, что видно, а не
 * к абстрактному описанию. Элемента нет (например, тур открыт со списка
 * участков, а речь про канвас) — шаг просто показывается без подсветки.
 *
 * Показывается один раз — после прохождения или пропуска ставит
 * localStorage-флаг и больше не всплывает. Бумажный стиль DESIGN.md.
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
  /** CSS-селектор элемента, который нужно подсветить на этом шаге */
  highlight?: string;
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
    highlight: '[data-tour="editor-modes"]',
  },
  {
    icon: '🌱',
    title: 'Посадите растение',
    text: 'Тапните по клумбе и выберите растение из справочника. Дальше — ведите журнал: полив, цветение, обрезка.',
  },
  {
    icon: '🌸',
    title: 'Смотрите по сезонам',
    text: 'Кнопка «Сезон» над схемой включает календарь цветения: выберите месяц — и увидите, что цветёт, а какие места в это время пустуют.',
    highlight: '[data-tour="season-button"]',
  },
  {
    icon: '💡',
    title: 'Спросите совета',
    text: 'Советник разберёт схему: подскажет, где пусто, какие растения не уживутся рядом и в какие месяцы сад останется без цветения.',
    highlight: '[data-tour="advisor-button"]',
  },
];

interface GuidedTourProps {
  /** Форсировать показ (для повторного вызова «Как это работает?»), игнорируя флаг */
  force?: boolean;
  /** Коллбэк после закрытия — например, сбросить force-режим */
  onClose?: () => void;
}

/** Рамка-подсветка поверх реального элемента шага */
function HighlightBox({ selector }: { selector: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const measure = () => {
      const el = document.querySelector(selector);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    // Элемент может ездить при ресайзе/скролле — держим рамку на месте.
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [selector]);

  if (!rect || rect.width === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-[51] rounded-[10px] border-2 border-red"
      style={{
        left: rect.left - 4,
        top: rect.top - 4,
        width: rect.width + 8,
        height: rect.height + 8,
        boxShadow: '0 0 0 9999px rgba(32,42,56,.35)',
      }}
    />
  );
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
  const isFirst = step === 0;
  const current = STEPS[step];

  return (
    <>
      {current.highlight && <HighlightBox selector={current.highlight} />}
      <div
        className="fixed inset-0 z-[52] flex items-center justify-center bg-ink/60 p-4"
        role="dialog"
        aria-modal="true"
        aria-label="Знакомство с приложением"
      >
        <div className="w-full max-w-sm rounded-[10px] border-2 border-ink bg-paper p-[5px] shadow-blank">
          <div className="rounded-[6px] border border-ink p-6 text-center">
            {/* Прогресс-бар: пройденные шаги закрашены, текущий — активен */}
            <div className="mb-5 flex gap-1" aria-hidden="true">
              {STEPS.map((s, i) => (
                <span
                  key={s.title}
                  className={[
                    'h-1.5 flex-1 rounded-full transition-colors',
                    i < step ? 'bg-ink/50' : i === step ? 'bg-ink' : 'bg-ink/20',
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

            <div className="mb-2 flex gap-2">
              {!isFirst && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="h-[44px] flex-1 rounded-lg border-2 border-ink bg-paper px-4 font-poster text-[14px] font-semibold uppercase tracking-[0.04em] text-ink transition-all duration-75 active:translate-y-[1px]"
                >
                  Назад
                </button>
              )}
              <button
                type="button"
                onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
                className="h-[44px] flex-1 rounded-lg border-2 border-ink bg-ink px-4 font-poster text-[14px] font-semibold uppercase tracking-[0.04em] text-paper transition-all duration-75 active:translate-y-[1px]"
              >
                {isLast ? 'Начать!' : 'Дальше'}
              </button>
            </div>
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
    </>
  );
}
