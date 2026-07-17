/**
 * Вымпел «УДАРНИК УЧЁТА» (DESIGN.md v5.1 §6).
 *
 * Треугольный флажок-вымпел: красный фон, золотой кант 2px,
 * текст Oswald 12px uppercase белый, наклон +3°, звезда слева.
 *
 * Реализация: вложенные div с clip-path (внешний = gold кант,
 * внутренний = красный фон) — даёт ровную обводку по всему контуру.
 * Текст поверх. Анимация появления гасится при prefers-reduced-motion.
 */

import type { CSSProperties } from 'react';
import { canvasColors } from '../theme/canvasColors';

interface BannerProps {
  /** Число дней стрика — подставляется в «N ДНЕЙ» */
  days: number;
  /** Текст по умолчанию «УДАРНИК УЧЁТА» */
  label?: string;
  className?: string;
}

/** Глубина треугольного среза справа, px */
const NOTCH = 12;

/** clip-path вымпела: прямоугольник слева, V-образный срез справа */
const pennantClip = `polygon(0 0, calc(100% - ${NOTCH}px) 0, 100% 50%, calc(100% - ${NOTCH}px) 100%, 0 100%)`;

/** Склонение слова «день» для числа дней */
function pluralizeDays(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'ДЕНЬ';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'ДНЯ';
  return 'ДНЕЙ';
}

const wrapperStyle: CSSProperties = {
  display: 'inline-block',
  transform: 'rotate(3deg)',
  transformOrigin: 'center center',
};

const kantStyle: CSSProperties = {
  background: canvasColors.gold,
  padding: '2px',
  clipPath: pennantClip,
  WebkitClipPath: pennantClip,
};

const bodyStyle: CSSProperties = {
  background: canvasColors.red,
  height: '28px',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  paddingInline: '12px',
  clipPath: pennantClip,
  WebkitClipPath: pennantClip,
};

const starStyle: CSSProperties = {
  color: canvasColors.gold,
  fontSize: '13px',
  lineHeight: 1,
  flexShrink: 0,
};

const textStyle: CSSProperties = {
  fontFamily: 'Oswald, system-ui, sans-serif',
  fontSize: '12px',
  lineHeight: 1,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  color: '#FFFFFF',
};

export function Banner({ days, label = 'УДАРНИК УЧЁТА', className = '' }: BannerProps) {
  return (
    <>
      <style>{`
        @keyframes banner-pop {
          0%   { opacity: 0; transform: rotate(3deg) scale(0.85); }
          100% { opacity: 1; transform: rotate(3deg) scale(1); }
        }
        .banner-pennant {
          animation: banner-pop 280ms ease-out both;
        }
        @media (prefers-reduced-motion: reduce) {
          .banner-pennant {
            animation: none;
          }
        }
      `}</style>
      <div className={`banner-pennant ${className}`} style={wrapperStyle}>
        {/* gold кант */}
        <div style={kantStyle}>
          {/* красное тело вымпела */}
          <div style={bodyStyle}>
            <span style={starStyle} aria-hidden="true">★</span>
            <span style={textStyle}>
              {label} · {days} {pluralizeDays(days)}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

export default Banner;
