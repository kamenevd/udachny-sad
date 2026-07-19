/**
 * OnboardingHint — подсказки для нового пользователя (задача 10.4).
 *
 * Показывает пошаговые подсказки при первом входе:
 * «Нарисуйте участок», «Посадите растение», «Ведите журнал».
 *
 * Подсказки исчезают после клика «Понятно» и не показываются снова
 * (localStorage флаг).
 *
 * DESIGN.md v5.1 — бумажный стиль, карточки с шагами.
 *
 * Использование:
 *   <OnboardingHint step="first-garden" />  // на Gardens при пустом списке
 *   <OnboardingHint step="first-planting" /> // в GardenDetail
 */

import { useState, type ReactNode } from 'react';

type Step = 'first-garden' | 'first-planting' | 'first-event';

interface HintConfig {
  icon: string;
  title: string;
  text: string;
  action: string;
}

const HINTS: Record<Step, HintConfig> = {
  'first-garden': {
    icon: '🗺️',
    title: 'Нарисуйте участок',
    text: 'Добавьте дом, грядки, теплицу. Разметьте где солнце, а где тень — потом будете знать, что где сажать.',
    action: 'Понятно!',
  },
  'first-planting': {
    icon: '🌱',
    title: 'Посадите растение',
    text: 'Тапните по объекту на схеме и выберите растение из справочника. Укажите сколько и когда посадили.',
    action: 'Понятно!',
  },
  'first-event': {
    icon: '📓',
    title: 'Ведите журнал',
    text: 'Записывайте что видите: полив, цветение, урожай, болезни. Через годы здесь будет история вашего участка.',
    action: 'Понятно!',
  },
};

interface OnboardingHintProps {
  step: Step;
  /** Дополнительный контент после текста (опционально) */
  children?: ReactNode;
}

export function OnboardingHint({ step, children }: OnboardingHintProps) {
  const storageKey = `onboarding-${step}-dismissed`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === 'true';
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const hint = HINTS[step];

  const handleDismiss = (): void => {
    try {
      localStorage.setItem(storageKey, 'true');
    } catch {
      // localStorage может быть недоступен (приватный режим) — просто скрываем
    }
    setDismissed(true);
  };

  return (
    <div
      className="rounded-[10px] border-2 border-blueink bg-surface p-[5px] shadow-blank"
      role="complementary"
      aria-label={`Подсказка: ${hint.title}`}
    >
      <div className="rounded-[6px] border border-blueink p-4">
        <div className="mb-2 flex items-center gap-3">
          <span className="text-[28px]">{hint.icon}</span>
          <h3 className="font-poster text-[18px] font-semibold uppercase tracking-[0.03em] text-blueink">
            {hint.title}
          </h3>
        </div>
        <p className="mb-4 text-[16px] leading-[1.5] text-ink">
          {hint.text}
        </p>
        {children}
        <button
          type="button"
          onClick={handleDismiss}
          className="h-[44px] w-full rounded-lg border-2 border-blueink bg-paper px-4 font-poster text-[14px] font-semibold uppercase tracking-[0.04em] text-blueink transition-all duration-75 active:translate-y-[1px]"
        >
          {hint.action}
        </button>
      </div>
    </div>
  );
}
