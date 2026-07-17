/**
 * Атрибутивные элементы генплана (Konva)
 * DESIGN.md v5.1 §3.4
 *
 * Три статичных элемента, привязанных к углам канвы:
 *  • CornerStamp  — угловой штамп листа (правый нижний)
 *  • NorthArrow   — стрелка севера (правый верхний)
 *  • ScaleBar     — масштабная линейка (левый нижний)
 *
 * Все три управляются единым prop `visible`: false при зуме ближе 1:50
 * (scale < 10 px/м). Логику скрытия определяет родитель.
 */

import { Group, Rect, Line, Text, Path } from 'react-konva';
import { canvasColors } from '../../theme/canvasColors';

export interface GenplanAttributesProps {
  /** Ширина канвы в пикселях */
  canvasWidth: number;
  /** Высота канвы в пикселях */
  canvasHeight: number;
  /** Масштаб: пикселей на метр (из canvasConfig.scale) */
  scale: number;
  /** Видимость: false при зуме ближе 1:50 (scale < 10) */
  visible: boolean;
}

// ─── Константы оформления ────────────────────────────────────────

/** Шрифты с системными фолбэками */
const FONT_DISPLAY = 'Oswald, system-ui, sans-serif';
const FONT_MONO = 'PT Mono, ui-monospace, monospace';

/** Отступ элементов от краёв канвы */
const MARGIN = 10;

// ─── Утилиты ─────────────────────────────────────────────────────

/**
 * Вычисляет знаменатель масштаба 1:N из px/м.
 *
 * Конвенция проекта:
 *   20 px/м → 1:100
 *   10 px/м → 1:50
 *
 * Следовательно denom = scale × 5.
 */
function scaleDenominator(scale: number): number {
  return Math.round(scale * 5);
}

// ═══════════════════════════════════════════════════════════════════
//  Угловой штамп листа — правый нижний угол
// ═══════════════════════════════════════════════════════════════════

const STAMP_W = 140;
const STAMP_H = 52;
const STAMP_PAD_X = 9;

/** Базовые Y-координаты трёх строк внутри штампа (относительно верха рамки) */
const STAMP_LINE_Y = [14, 30, 44] as const;

export function CornerStamp({
  canvasWidth,
  canvasHeight,
  scale,
  visible,
}: GenplanAttributesProps) {
  const denom = scaleDenominator(scale);
  const year = new Date().getFullYear();

  // Правый нижний угол с отступом MARGIN
  const x = canvasWidth - STAMP_W - MARGIN;
  const y = canvasHeight - STAMP_H - MARGIN;
  const innerW = STAMP_W - STAMP_PAD_X * 2;

  return (
    <Group visible={visible}>
      {/* Рамка ink 1.5px */}
      <Rect
        x={x}
        y={y}
        width={STAMP_W}
        height={STAMP_H}
        fill={canvasColors.paper}
        stroke={canvasColors.ink}
        strokeWidth={1.5}
      />

      {/* (a) «УДАЧНЫЙ САД» — Oswald 10px */}
      <Text
        x={x + STAMP_PAD_X}
        y={y + STAMP_LINE_Y[0]}
        width={innerW}
        text="УДАЧНЫЙ САД"
        fontFamily={FONT_DISPLAY}
        fontSize={10}
        fill={canvasColors.ink}
      />

      {/* (b) «ГЕНПЛАН УЧАСТКА» — Oswald 12px / 700 */}
      <Text
        x={x + STAMP_PAD_X}
        y={y + STAMP_LINE_Y[1]}
        width={innerW}
        text="ГЕНПЛАН УЧАСТКА"
        fontFamily={FONT_DISPLAY}
        fontSize={12}
        fontStyle="bold"
        fill={canvasColors.ink}
      />

      {/* (c) «М 1:{denom} · ЛИСТ 1 · {год}» — PT Mono 9.5px */}
      <Text
        x={x + STAMP_PAD_X}
        y={y + STAMP_LINE_Y[2]}
        width={innerW}
        text={`М 1:${denom} · ЛИСТ 1 · ${year}`}
        fontFamily={FONT_MONO}
        fontSize={9.5}
        fill={canvasColors.inkMuted}
      />
    </Group>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Стрелка севера — правый верхний угол
// ═══════════════════════════════════════════════════════════════════

/** Габариты стрелки (без учёта буквы «С») */
const ARROW_W = 16;
const TRIANGLE_H = 8; // высота наконечника-треугольника
const TRIANGLE_HALF_BASE = 5; // полуширина основания треугольника
const SHAFT_LEN = 24; // длина стержня
const LABEL_H = 14; // высота строки буквы «С»
const LABEL_GAP = 3; // зазор между буквой и наконечником

export function NorthArrow({
  canvasWidth,
  visible,
}: GenplanAttributesProps) {
  // Центрируем по горизонтали в правом верхнем углу
  const cx = canvasWidth - MARGIN - ARROW_W / 2;

  // Вертикальная раскладка сверху вниз: «С» → зазор → треугольник → стержень
  const labelY = MARGIN;
  const arrowTipY = labelY + LABEL_H + LABEL_GAP;
  const triangleBaseY = arrowTipY + TRIANGLE_H;
  const arrowBottomY = triangleBaseY + SHAFT_LEN;

  // Path для заполненного треугольника, остриём вверх
  const trianglePath = [
    `M ${cx} ${arrowTipY}`,
    `L ${cx - TRIANGLE_HALF_BASE} ${triangleBaseY}`,
    `L ${cx + TRIANGLE_HALF_BASE} ${triangleBaseY}`,
    'Z',
  ].join(' ');

  return (
    <Group visible={visible}>
      {/* Буква «С» над стрелкой — PT Mono 12px / 700 */}
      <Text
        x={cx - ARROW_W / 2}
        y={labelY}
        width={ARROW_W}
        align="center"
        text="С"
        fontFamily={FONT_MONO}
        fontSize={12}
        fontStyle="bold"
        fill={canvasColors.ink}
      />

      {/* Наконечник-треугольник вверх (заполненный ink) */}
      <Path data={trianglePath} fill={canvasColors.ink} />

      {/* Стержень — тонкая вертикальная линия ink */}
      <Line
        points={[cx, triangleBaseY, cx, arrowBottomY]}
        stroke={canvasColors.ink}
        strokeWidth={1.5}
        lineCap="round"
      />
    </Group>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Масштабная линейка — левый нижний угол
// ═══════════════════════════════════════════════════════════════════

/** Количество метровых сегментов */
const BAR_SEGMENTS = 5;
/** Высота полосы линейки */
const BAR_H = 6;
/** Зазор между полосой и подписями */
const BAR_LABEL_GAP = 3;
/** Высота строки подписей */
const BAR_LABEL_H = 12;
/** Подписи делений: 6 значений для 5 сегментов */
const BAR_LABELS = ['0', '1м', '2м', '3м', '4м', '5м'] as const;

export function ScaleBar({
  canvasHeight,
  scale,
  visible,
}: GenplanAttributesProps) {
  // 1 метр в пикселях = scale; полная длина = 5 метров
  const segPx = scale;
  const totalW = segPx * BAR_SEGMENTS;

  const totalH = BAR_H + BAR_LABEL_GAP + BAR_LABEL_H;
  const x = MARGIN;
  const barY = canvasHeight - MARGIN - totalH;
  const labelY = barY + BAR_H + BAR_LABEL_GAP;

  return (
    <Group visible={visible}>
      {/* Чередующиеся чёрно-белые сегменты (без обводки — граница общая) */}
      {Array.from({ length: BAR_SEGMENTS }).map((_, i) => {
        const isDark = i % 2 === 0;
        return (
          <Rect
            key={`seg-${i}`}
            x={x + i * segPx}
            y={barY}
            width={segPx}
            height={BAR_H}
            fill={isDark ? canvasColors.ink : canvasColors.paper}
          />
        );
      })}

      {/* Внешняя рамка полосы */}
      <Rect
        x={x}
        y={barY}
        width={totalW}
        height={BAR_H}
        stroke={canvasColors.ink}
        strokeWidth={1}
      />

      {/* Внутренние деления между сегментами */}
      {Array.from({ length: BAR_SEGMENTS - 1 }).map((_, i) => {
        const tickX = x + (i + 1) * segPx;
        return (
          <Line
            key={`tick-${i}`}
            points={[tickX, barY, tickX, barY + BAR_H]}
            stroke={canvasColors.ink}
            strokeWidth={1}
          />
        );
      })}

      {/* Подписи делений — PT Mono, центрированы над каждым штрихом */}
      {BAR_LABELS.map((label, i) => {
        const tickX = x + i * segPx;
        return (
          <Text
            key={`lbl-${i}`}
            x={tickX - 10}
            y={labelY}
            width={20}
            align="center"
            text={label}
            fontFamily={FONT_MONO}
            fontSize={9}
            fill={canvasColors.ink}
          />
        );
      })}
    </Group>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Составной компонент — рендерит все три элемента
// ═══════════════════════════════════════════════════════════════════

/**
 * Все атрибутивные элементы генплана разом.
 * Удобно, когда родителю нужны все три с одинаковыми параметрами.
 */
export function GenplanAttributes(props: GenplanAttributesProps) {
  return (
    <>
      <CornerStamp {...props} />
      <NorthArrow {...props} />
      <ScaleBar {...props} />
    </>
  );
}

export default GenplanAttributes;
