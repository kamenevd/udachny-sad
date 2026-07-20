/**
 * PLAN12 задача 10 — анализ схемы участка и рекомендации по ландшафту.
 *
 * Пять групп правил (логика чистая, её гоняет landscapeAdvisor.test.ts):
 *   empty_zone      — клумба/композиция нарисована, но пустая;
 *   incompatible    — на одном месте растения из `incompatible_ids` друг друга;
 *   light_mismatch  — светолюбивое в зоне тени (и наоборот);
 *   color           — цветовые сочетания внутри одного места;
 *   season_gap      — месяцы сезона, в которые на участке ничего не цветёт.
 *
 * Советник смотрит только на то, что уже есть на схеме, и никуда не ходит по
 * сети — в отличие от AiCareTip, который спрашивает GLM. Поэтому он работает
 * офлайн и мгновенно, а панель советов (AiLandscapeTips) просто его отражает.
 */

import { useMemo } from 'react';
import type { Plant } from '../lib/pb';
import { bloomMonthsOf } from './useBloomingSeasons';
import { pointInPolygon, type LightCondition } from '../lib/compositionContext';
import { centroidOf } from './useCanvasSearch';
import { colorFamilyOf } from '../components/PlantWizard/matchPlants';
import { MONTHS_RU_IN } from '../types/plant';

export type AdviceKind =
  | 'empty_zone' | 'incompatible' | 'light_mismatch' | 'color' | 'season_gap';

export interface LandscapeAdvice {
  id: string;
  kind: AdviceKind;
  severity: 'info' | 'warning';
  title: string;
  text: string;
  /** Объект схемы, к которому относится совет — панель умеет показать его */
  objectId?: string;
}

/** Объект схемы в координатах модели (метры) */
export interface AdvisorObject {
  id: string;
  type: string;
  label?: string;
  geometry: { points: number[][] };
}

export interface AdvisorPlanting {
  schemaObjectId?: string;
  plant: Plant | null;
}

export interface AdvisorZone {
  condition: LightCondition;
  geometry: { points: number[][] };
}

export interface LandscapeAdvisorInput {
  objects: AdvisorObject[];
  plantings: AdvisorPlanting[];
  lightZones?: AdvisorZone[];
}

/** Типы объектов, которые должны быть засажены — пустые попадают в советы */
const PLANTABLE_TYPES = new Set(['flowerbed', 'composition', 'hedge']);

/** Сезон Подмосковья: вне апреля-октября отсутствие цветения — норма */
const SEASON_MONTHS = [4, 5, 6, 7, 8, 9, 10];

function objectName(obj: AdvisorObject): string {
  if (obj.label?.trim()) return obj.label.trim();
  return obj.type === 'composition' ? 'Композиция' : obj.type === 'hedge' ? 'Изгородь' : 'Клумба';
}

/** Освещённость точки по светозонам: побеждает первая накрывшая зона */
function conditionAt(
  point: { x: number; y: number },
  zones: AdvisorZone[],
): LightCondition | null {
  for (const zone of zones) {
    if (pointInPolygon(point, zone.geometry.points)) return zone.condition;
  }
  return null;
}

export function analyzeLandscape(input: LandscapeAdvisorInput): LandscapeAdvice[] {
  const { objects, plantings, lightZones = [] } = input;
  const advice: LandscapeAdvice[] = [];

  // Посадки по объектам схемы
  const byObject = new Map<string, AdvisorPlanting[]>();
  for (const planting of plantings) {
    if (!planting.schemaObjectId) continue;
    const list = byObject.get(planting.schemaObjectId) ?? [];
    list.push(planting);
    byObject.set(planting.schemaObjectId, list);
  }

  for (const obj of objects) {
    const here = byObject.get(obj.id) ?? [];
    const name = objectName(obj);

    // ── Пустые зоны ────────────────────────────────────────────────
    if (PLANTABLE_TYPES.has(obj.type) && here.length === 0) {
      const centroid = centroidOf(obj.geometry.points);
      const condition = conditionAt(centroid, lightZones);
      const hint =
        condition === 'shade'
          ? 'Место в тени — подойдут хоста, астильба или бадан.'
          : condition === 'partial_shade'
            ? 'Место в полутени — подойдут гейхера, аквилегия или гортензия.'
            : condition === 'sunny'
              ? 'Место на солнце — подойдут флоксы, эхинацея или лилейник.'
              : 'Откройте мастер подбора — он предложит состав под ваши условия.';
      advice.push({
        id: `empty:${obj.id}`,
        kind: 'empty_zone',
        severity: 'info',
        title: `${name} пока пустая`,
        text: hint,
        objectId: obj.id,
      });
      continue; // остальные правила по этому объекту без посадок бессмысленны
    }

    const plants = here.map((p) => p.plant).filter((p): p is Plant => p != null);
    if (plants.length === 0) continue;

    // ── Несовместимые соседи ───────────────────────────────────────
    for (let i = 0; i < plants.length; i += 1) {
      for (let j = i + 1; j < plants.length; j += 1) {
        const a = plants[i];
        const b = plants[j];
        const aBad = Array.isArray(a.incompatible_ids) ? a.incompatible_ids : [];
        const bBad = Array.isArray(b.incompatible_ids) ? b.incompatible_ids : [];
        const clash =
          (b.catalogId != null && aBad.includes(b.catalogId)) ||
          (a.catalogId != null && bBad.includes(a.catalogId));
        if (!clash) continue;
        advice.push({
          id: `incompat:${obj.id}:${a.id}:${b.id}`,
          kind: 'incompatible',
          severity: 'warning',
          title: `${a.name} и ${b.name} — плохие соседи`,
          text: `На месте «${name}» они конкурируют за воду и питание. Разнесите их или добавьте между ними разделительный бордюр.`,
          objectId: obj.id,
        });
      }
    }

    // ── Освещение против зоны ──────────────────────────────────────
    const centroid = centroidOf(obj.geometry.points);
    const condition = conditionAt(centroid, lightZones);
    if (condition) {
      for (const plant of plants) {
        const wrongSun = plant.sun_exposure === 'full_sun' && condition === 'shade';
        const wrongShade = plant.sun_exposure === 'full_shade' && condition === 'sunny';
        if (!wrongSun && !wrongShade) continue;
        advice.push({
          id: `light:${obj.id}:${plant.id}`,
          kind: 'light_mismatch',
          severity: 'warning',
          title: `${plant.name} посажена не по свету`,
          text: wrongSun
            ? `Растению нужно солнце, а место «${name}» отмечено как тень — цветение будет слабым.`
            : `Растение тенелюбивое, а место «${name}» на открытом солнце — листья будут выгорать.`,
          objectId: obj.id,
        });
      }
    }

    // ── Цветовые сочетания ─────────────────────────────────────────
    const families = new Set(
      plants
        .filter((p) => p.primary_color && bloomMonthsOf(p).length > 0)
        .map((p) => colorFamilyOf(p.primary_color as string)),
    );
    if (families.has('warm') && families.has('cool')) {
      advice.push({
        id: `color:${obj.id}`,
        kind: 'color',
        severity: 'info',
        title: `«${name}»: контрастная гамма`,
        text: 'Тёплые и холодные тона рядом дают резкий контраст. Смягчите переход белыми или зелёными растениями — например, манжеткой.',
        objectId: obj.id,
      });
    } else if (families.size === 1 && plants.length >= 3) {
      const only = [...families][0];
      advice.push({
        id: `color:${obj.id}`,
        kind: 'color',
        severity: 'info',
        title: `«${name}»: гамма выдержана`,
        text:
          only === 'white'
            ? 'Белый монохром — можно добавить акцент одного яркого цвета, чтобы цветник не выглядел плоским.'
            : 'Все растения в одной гамме — спокойное сочетание. Акцент контрастного цвета добавит глубины.',
        objectId: obj.id,
      });
    }
  }

  // ── Провалы в цветении по сезону ─────────────────────────────────
  const bloomingMonths = new Set<number>();
  for (const planting of plantings) {
    if (!planting.plant) continue;
    for (const month of bloomMonthsOf(planting.plant)) bloomingMonths.add(month);
  }
  if (bloomingMonths.size > 0) {
    const gaps = SEASON_MONTHS.filter((m) => !bloomingMonths.has(m));
    if (gaps.length > 0) {
      advice.push({
        id: 'season_gap',
        kind: 'season_gap',
        severity: 'info',
        title: 'Пауза в цветении',
        text: `На участке ничего не цветёт в ${gaps
          .map((m) => MONTHS_RU_IN[m - 1])
          .join(', ')}. Подберите растения на эти месяцы — календарь цветения покажет, кого не хватает.`,
      });
    }
  }

  // Предупреждения важнее наблюдений — поднимаем их наверх.
  return advice.sort((a, b) =>
    a.severity === b.severity ? 0 : a.severity === 'warning' ? -1 : 1,
  );
}

export function useLandscapeAdvisor(input: LandscapeAdvisorInput): LandscapeAdvice[] {
  const { objects, plantings, lightZones } = input;
  return useMemo(
    () => analyzeLandscape({ objects, plantings, lightZones }),
    [objects, plantings, lightZones],
  );
}
