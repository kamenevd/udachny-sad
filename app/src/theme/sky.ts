/**
 * Плакатное небо — лучи по времени суток
 * DESIGN.md v5.1 §2
 */

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';

/**
 * Возвращает локальное время суток
 */
export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return 'morning';
  if (hour >= 10 && hour < 17) return 'day';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

/**
 * Лучи для фона (repeating-conic-gradient)
 * Точка источника: 50% 128% (ниже края экрана)
 */
export function getSkyGradient(time: TimeOfDay): string {
  switch (time) {
    case 'morning':
      return 'repeating-conic-gradient(from 0deg at 50% 128%, #F7EFD9 0 8deg, #F0DFB4 8deg 16deg)';
    case 'day':
      return 'repeating-conic-gradient(from 0deg at 50% 128%, #F7EFD9 0 8deg, #EAD9A8 8deg 16deg)';
    case 'evening':
      // Красное знамя заката
      return 'repeating-conic-gradient(from 0deg at 50% 128%, #E8B98F 0 8deg, #C65B45 8deg 16deg)';
    case 'night':
      // Тёмно-синий сплошной + звёзды
      return `
        radial-gradient(1.5px 1.5px at 15% 30%, #fff 99%, transparent),
        radial-gradient(1.5px 1.5px at 70% 20%, #fff 99%, transparent),
        radial-gradient(1px 1px at 40% 60%, #fff 99%, transparent),
        radial-gradient(1.5px 1.5px at 88% 55%, #fff 99%, transparent),
        #1E2C48
      `;
  }
}

/**
 * Класс для ночи (изменяет цвет текста на белый)
 */
export function isNightMode(time: TimeOfDay): boolean {
  return time === 'night';
}