/**
 * Паттерны для генплана участка (Konva canvas)
 * Сопоставлены с DESIGN.md v5.1 §3.2
 */

import type Konva from 'konva';
import { canvasColors } from './canvasColors';

/**
 * Создаёт data URI для паттерна
 */
function createPattern(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to create pattern canvas');
  draw(ctx);
  return canvas.toDataURL();
}

/**
 * Клетка тетради (1px, шаг 1м = 20px в масштабе 1:100)
 */
export const gridPattern = createPattern(20, 20, (ctx) => {
  ctx.strokeStyle = canvasColors.gridBlue;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(0, 20);
  ctx.stroke();
});

/**
 * Каждая 5-я линия (толще, шаг 5м = 100px)
 */
export const gridPattern5 = createPattern(100, 100, (ctx) => {
  ctx.strokeStyle = canvasColors.gridBlue5;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(100, 0);
  ctx.lineTo(0, 100);
  ctx.stroke();
});

/**
 * Галочки травы (шаг 26px)
 */
export const grassPattern = createPattern(26, 26, (ctx) => {
  ctx.strokeStyle = canvasColors.grassPattern;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(4, 9);
  ctx.lineTo(7, 5);
  ctx.lineTo(10, 9);
  ctx.moveTo(15, 21);
  ctx.lineTo(18, 17);
  ctx.lineTo(21, 21);
  ctx.stroke();
});

/**
 * Параллельные бороздки (пашня) — добавляется к грядкам
 */
export function drawBedPattern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
) {
  ctx.strokeStyle = canvasColors.bedPattern;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  const step = 20;
  const startY = y + 20;
  for (let py = startY; py < y + height - 20; py += step) {
    ctx.beginPath();
    ctx.moveTo(x + 9, py);
    ctx.lineTo(x + width - 9, py);
    ctx.stroke();
  }
}

/**
 * Точечная заливка (цветник)
 */
export const flowerPattern = createPattern(11, 11, (ctx) => {
  ctx.fillStyle = canvasColors.flowerPattern;
  ctx.beginPath();
  ctx.arc(5.5, 5.5, 1.3, 0, Math.PI * 2);
  ctx.fill();
});

/**
 * Точки-гравий
 */
export const gravelPattern = createPattern(12, 12, (ctx) => {
  ctx.fillStyle = canvasColors.pathPattern;
  ctx.beginPath();
  ctx.arc(4, 4, 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(9, 9, 1.2, 0, Math.PI * 2);
  ctx.fill();
});

/**
 * Диагональная штриховка (капитальное строение)
 */
export const buildingPattern = createPattern(8, 8, (ctx) => {
  ctx.strokeStyle = canvasColors.buildingPattern;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 8);
  ctx.stroke();
});

/**
 * Сетка остекления (теплица) — обе диагонали
 */
export const greenhousePattern = createPattern(12, 12, (ctx) => {
  ctx.strokeStyle = canvasColors.greenhousePattern;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 12);
  ctx.lineTo(12, 0);
  ctx.moveTo(0, 0);
  ctx.lineTo(12, 12);
  ctx.stroke();
});

/**
 * Горизонтальные волнистые линии (вода)
 */
export function drawWaterPattern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number
) {
  ctx.strokeStyle = canvasColors.waterPattern;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  const step = 9;
  const startX = x + 2;
  for (let px = startX; px < x + width - 4; px += step) {
    ctx.beginPath();
    ctx.moveTo(px, y + 4);
    ctx.quadraticCurveTo(px + 4, y - 1, px + 8, y + 4);
    ctx.stroke();
  }
}

/**
 * Штриховка для тени
 */
export const shadowPattern = createPattern(9, 9, (ctx) => {
  ctx.strokeStyle = canvasColors.zoneShadowPattern;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 9);
  ctx.stroke();
});

/**
 * Штриховка для влажности
 */
export const wetPattern = createPattern(9, 9, (ctx) => {
  ctx.strokeStyle = canvasColors.zoneWetPattern;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 9);
  ctx.stroke();
});

/**
 * Зубчатая крона дерева (sceneFunc для Konva.Shape)
 * @param ctx Canvas context
 * @param shape Konva shape
 * @param radiusPx Радиус кроны в пикселях
 */
export function drawTreeCrown(
  ctx: CanvasRenderingContext2D,
  shape: Konva.Shape,
  radiusPx: number
) {
  const teethCount = Math.max(8, Math.floor(radiusPx / 3.2));
  const angleStep = (Math.PI * 2) / teethCount;
  const chordLength = 2 * radiusPx * Math.sin(angleStep / 2);
  const arcRadius = chordLength / 1.7;
  const arcAngle = angleStep / 2;

  ctx.beginPath();

  for (let i = 0; i < teethCount; i++) {
    const startAngle = i * angleStep;
    const midAngle = startAngle + arcAngle;
    const endAngle = startAngle + angleStep;

    // Начало зубца
    const x1 = radiusPx + radiusPx * Math.cos(startAngle);
    const y1 = radiusPx + radiusPx * Math.sin(startAngle);

    // Вершина зубца (дуга наружу)
    const x2 = radiusPx + arcRadius * Math.cos(midAngle);
    const y2 = radiusPx + arcRadius * Math.sin(midAngle);

    // Конец зубца
    const x3 = radiusPx + radiusPx * Math.cos(endAngle);
    const y3 = radiusPx + radiusPx * Math.sin(endAngle);

    if (i === 0) {
      ctx.moveTo(x1, y1);
    }

    // Дуга наружу
    ctx.quadraticCurveTo(x2, y2, x3, y3);
  }

  ctx.closePath();

  // Заливка
  ctx.fillStyle = canvasColors.treeFill;
  ctx.fill();

  // Контур
  ctx.strokeStyle = canvasColors.ink;
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

/**
 * Малый зубчатый контур (кустарник)
 */
export function drawShrubCrown(
  ctx: CanvasRenderingContext2D,
  shape: Konva.Shape,
  radiusPx: number
) {
  const teethCount = Math.max(6, Math.floor(radiusPx / 2.5));
  const angleStep = (Math.PI * 2) / teethCount;
  const chordLength = 2 * radiusPx * Math.sin(angleStep / 2);
  const arcRadius = chordLength / 1.7;
  const arcAngle = angleStep / 2;

  ctx.beginPath();

  for (let i = 0; i < teethCount; i++) {
    const startAngle = i * angleStep;
    const midAngle = startAngle + arcAngle;
    const endAngle = startAngle + angleStep;

    const x1 = radiusPx + radiusPx * Math.cos(startAngle);
    const y1 = radiusPx + radiusPx * Math.sin(startAngle);
    const x2 = radiusPx + arcRadius * Math.cos(midAngle);
    const y2 = radiusPx + arcRadius * Math.sin(midAngle);
    const x3 = radiusPx + radiusPx * Math.cos(endAngle);
    const y3 = radiusPx + radiusPx * Math.sin(endAngle);

    if (i === 0) {
      ctx.moveTo(x1, y1);
    }
    ctx.quadraticCurveTo(x2, y2, x3, y3);
  }

  ctx.closePath();

  ctx.fillStyle = canvasColors.shrubFill;
  ctx.fill();

  ctx.strokeStyle = canvasColors.ink;
  ctx.lineWidth = 2.2;
  ctx.stroke();
}