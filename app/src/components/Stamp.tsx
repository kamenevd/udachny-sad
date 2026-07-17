/**
 * Печать-подтверждение — круглый SVG-оттиск (DESIGN.md v5.1 §6 Печать)
 *
 * Круглый ⌀110px оттиск с двумя кольцами, текстом по кругу и действием в центре.
 * Появляется «ударом»: scale 1.2 → 1 за 300ms ease-out.
 * Уважает prefers-reduced-motion (мгновенный показ).
 */

import { useEffect, useRef, useState } from 'react';

interface StampProps {
  /** Текст действия в центре (например 'ПОСАЖЕНО', 'СПИСАНО') */
  action: string;
  className?: string;
}

const R = 55; // радиус центра viewBox 110×110

export function Stamp({ action, className = '' }: StampProps) {
  const [animate, setAnimate] = useState(false);
  const ref = useRef<SVGSVGElement>(null);

  // Проверяем prefers-reduced-motion и запускаем анимацию «удара»
  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setAnimate(true);
      return;
    }
    // Запускаем анимацию на следующем тике (scale 1.2 → 1)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setAnimate(true));
    });
  }, []);

  // Радиусы для колец
  // Внешний круг ⌀ ~104 (radius 52), strokeWidth 3
  // Внутренний круг на ~8px глубже — radius 44, strokeWidth 1.5
  const outerR = 52;
  const innerR = 44;

  // Радиус для дуги текста (между кольцами)
  // между 44 и 52 → середина ~47, но textSize вычитается, возьмём 48
  const textR = 48;

  // Верхняя дуга для textPath: идём слева-вправо по верху окружности
  // Стартуем с (cx - r, cy), дуга через верхнюю точку — sweepFlag=1 (по часовой от левой к правой через верх? нет)
  // Для верхней дуги используем: M (cx-r) cy A r r 0 0 1 (cx+r) cy — sweepFlag=1 даст дугу снизу, надо 0?
  // SVG arc: sweep-flag=1 → positive-angle (по часовой). Из точки слева в точку справа через верх — sweep-flag=1.
  // Проверено: при sweepFlag=1 дуга идёт сверху.
  const cx = R;
  const cy = R;
  const textArcPath = `M ${cx - textR} ${cy} A ${textR} ${textR} 0 0 1 ${cx + textR} ${cy}`;

  return (
    <svg
      ref={ref}
      viewBox="0 0 110 110"
      width="110"
      height="110"
      className={className}
      style={{
        color: '#BF2E24',
        transform: `rotate(-8deg) scale(${animate ? 1 : 1.2})`,
        transformOrigin: '55px 55px',
        transition: animate ? 'transform 300ms ease-out' : 'none',
      }}
      role="img"
      aria-label={`Печать: ${action}`}
    >
      <defs>
        <path id="stamp-text-arc" d={textArcPath} fill="none" />
      </defs>

      {/* Внешнее толстое кольцо */}
      <circle
        cx={cx}
        cy={cy}
        r={outerR}
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
      />

      {/* Внутреннее тонкое кольцо */}
      <circle
        cx={cx}
        cy={cy}
        r={innerR}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      />

      {/* Текст по кругу между кольцами */}
      <text
        className="font-poster"
        style={{
          fontFamily: 'Oswald, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontSize: '8px',
          fontWeight: 600,
        }}
        fill="currentColor"
      >
        <textPath href="#stamp-text-arc" startOffset="50%" textAnchor="middle">
          УДАЧНЫЙ САД · ЖУРНАЛ УЧЁТА САДОВОДА
        </textPath>
      </text>

      {/* Центральный текст — действие КАПСОМ + ★ */}
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        className="font-poster"
        style={{
          fontFamily: 'Oswald, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          fontSize: '11px',
          fontWeight: 700,
        }}
        fill="currentColor"
      >
        {action} ★
      </text>
    </svg>
  );
}

export default Stamp;
