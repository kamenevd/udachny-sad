import type { Shape } from './geometry'
import { clamp } from './geometry'
import type { FeatureKind } from './types'

/**
 * Стартовая схема с фото: человек проходит участок по точкам съёмки,
 * которые показывает приложение, и снимает с каждой по кадру.
 * Дальше план рисуется сам: сервер разбирает фото, а если не смог —
 * черновик собирается прямо по точкам съёмки. Никаких вопросов про фото.
 */

export interface StartupPoint {
  id: string
  /** Номер на карте. */
  n: number
  /** Короткое имя точки. */
  label: string
  /** Подсказка: где встать и куда смотреть. */
  hint: string
  /** Где встать: доли ширины/высоты участка, 0..1. Калитка — снизу. */
  x: number
  y: number
  /** Куда смотрит камера: направление в тех же осях. */
  dx: number
  dy: number
  /** Обязательные точки закрывают прогулку; остальные — по желанию. */
  required: boolean
}

export const STARTUP_POINTS: StartupPoint[] = [
  {
    id: 'gate',
    n: 1,
    label: 'Калитка',
    hint: 'Встаньте у калитки и снимите участок — как видите его, заходя с улицы.',
    x: 0.5,
    y: 0.94,
    dx: 0,
    dy: -1,
    required: true,
  },
  {
    id: 'house',
    n: 2,
    label: 'От дома в сад',
    hint: 'Подойдите к дому, встаньте спиной к нему и снимите сад.',
    x: 0.5,
    y: 0.68,
    dx: 0,
    dy: -1,
    required: true,
  },
  {
    id: 'far-left',
    n: 3,
    label: 'Дальний левый угол',
    hint: 'Дойдите до дальнего левого угла и снимите в сторону дома.',
    x: 0.08,
    y: 0.08,
    dx: 0.7,
    dy: 0.7,
    required: true,
  },
  {
    id: 'far-right',
    n: 4,
    label: 'Дальний правый угол',
    hint: 'Теперь дальний правый угол — и снова снимите в сторону дома.',
    x: 0.92,
    y: 0.08,
    dx: -0.7,
    dy: 0.7,
    required: true,
  },
  {
    id: 'path',
    n: 5,
    label: 'Середина дорожки',
    hint: 'Встаньте на главную дорожку примерно посередине и снимите вдоль неё.',
    x: 0.5,
    y: 0.42,
    dx: 0,
    dy: -1,
    required: true,
  },
  {
    id: 'left-side',
    n: 6,
    label: 'Левый край',
    hint: 'Если хочется точнее: с середины левого края снимите поперёк участка.',
    x: 0.08,
    y: 0.5,
    dx: 1,
    dy: 0,
    required: false,
  },
  {
    id: 'right-side',
    n: 7,
    label: 'Правый край',
    hint: 'И с середины правого края — поперёк участка.',
    x: 0.92,
    y: 0.5,
    dx: -1,
    dy: 0,
    required: false,
  },
]

/** Минимум снимков, чтобы рисовать план. */
export const MIN_STARTUP_PHOTOS = 3

export function requiredStartupPoints(): StartupPoint[] {
  return STARTUP_POINTS.filter((p) => p.required)
}

export function startupPointById(id: string): StartupPoint | null {
  return STARTUP_POINTS.find((p) => p.id === id) ?? null
}

/** Хватает ли снимков, чтобы нажать «Готово, рисуй». */
export function canDrawStartup(shotCount: number): boolean {
  return shotCount >= MIN_STARTUP_PHOTOS
}

/** Прогулка закончена: каждая обязательная точка снята или пропущена. */
export function startupWalkDone(shotIds: string[], skippedIds: string[]): boolean {
  return requiredStartupPoints().every(
    (p) => shotIds.includes(p.id) || skippedIds.includes(p.id),
  )
}

/** Следующая точка, куда идти: первая обязательная без снимка и без пропуска. */
export function nextStartupPoint(shotIds: string[], skippedIds: string[]): StartupPoint | null {
  return (
    requiredStartupPoints().find(
      (p) => !shotIds.includes(p.id) && !skippedIds.includes(p.id),
    ) ?? null
  )
}

export interface StartupFeatureDraft {
  kind: FeatureKind
  shape: Shape
}

// ---------------------------------------------------------------------------
// Разбор ответа модели: JSON с относительными координатами (0..1) или метрами.
// Всё защищено от мусора: невалидные куски просто пропускаются.
// ---------------------------------------------------------------------------

function fin(v: unknown): number | null {
  const n = typeof v === 'number' ? v : NaN
  return Number.isFinite(n) ? n : null
}

function pairList(v: unknown): Array<[number, number]> {
  if (!Array.isArray(v)) return []
  const out: Array<[number, number]> = []
  for (const item of v) {
    if (!Array.isArray(item)) continue
    const x = fin(item[0])
    const y = fin(item[1])
    if (x === null || y === null) continue
    out.push([x, y])
  }
  return out
}

/** Собирает все координаты, чтобы понять единицы: доли 0..1 или метры. */
function detectMeters(raw: Record<string, unknown>): boolean {
  const coords: number[] = []
  const push = (v: unknown) => {
    const n = fin(v)
    if (n !== null) coords.push(Math.abs(n))
  }
  const pushObj = (o: unknown, keys: string[]) => {
    if (!o || typeof o !== 'object') return
    for (const k of keys) push((o as Record<string, unknown>)[k])
  }
  for (const [x, y] of pairList(raw.outline)) {
    coords.push(Math.abs(x), Math.abs(y))
  }
  pushObj(raw.house, ['cx', 'cy', 'x', 'y'])
  for (const key of ['buildings', 'beds', 'trees', 'water'] as const) {
    const list = raw[key]
    if (!Array.isArray(list)) continue
    for (const item of list) pushObj(item, ['cx', 'cy'])
  }
  if (Array.isArray(raw.paths)) {
    for (const p of raw.paths) {
      if (!p || typeof p !== 'object') continue
      for (const [x, y] of pairList((p as Record<string, unknown>).points)) {
        coords.push(Math.abs(x), Math.abs(y))
      }
    }
  }
  if (coords.length === 0) return false
  return Math.max(...coords) > 1.5
}

interface Scale {
  x: (v: number) => number
  y: (v: number) => number
  /** Размер по короткой стороне (радиусы деревьев, ширина дорожки). */
  s: (v: number) => number
  /** Размер вдоль ширины участка. */
  sw: (v: number) => number
  /** Размер вдоль глубины участка. */
  sh: (v: number) => number
  w: number
  h: number
}

function makeScale(meters: boolean, width: number, height: number): Scale {
  const short = Math.min(width, height)
  return {
    x: (v) => clamp(meters ? v : v * width, 0, width),
    y: (v) => clamp(meters ? v : v * height, 0, height),
    s: (v) => (meters ? v : v * short),
    sw: (v) => (meters ? v : v * width),
    sh: (v) => (meters ? v : v * height),
    w: width,
    h: height,
  }
}

function rectDraft(
  o: Record<string, unknown>,
  kind: FeatureKind,
  sc: Scale,
  minSide: number,
): StartupFeatureDraft | null {
  let cx = fin(o.cx)
  let cy = fin(o.cy)
  const wRaw = fin(o.w)
  const hRaw = fin(o.h)
  if (wRaw === null || hRaw === null) return null
  if (cx === null || cy === null) {
    // Допускаем вариант с левым верхним углом.
    const x = fin(o.x)
    const y = fin(o.y)
    if (x === null || y === null) return null
    cx = x + wRaw / 2
    cy = y + hRaw / 2
  }
  const w = clamp(sc.sw(Math.abs(wRaw)), minSide, sc.w * 0.8)
  const h = clamp(sc.sh(Math.abs(hRaw)), minSide, sc.h * 0.8)
  const x0 = clamp(sc.x(cx) - w / 2, 0, Math.max(0, sc.w - w))
  const y0 = clamp(sc.y(cy) - h / 2, 0, Math.max(0, sc.h - h))
  const angle = fin(o.angle)
  return {
    kind,
    shape: {
      t: 'rect',
      x: +x0.toFixed(2),
      y: +y0.toFixed(2),
      w: +w.toFixed(2),
      h: +h.toFixed(2),
      ...(angle ? { a: Math.round(clamp(angle, -180, 360)) } : {}),
    },
  }
}

function ellipseDraft(
  o: Record<string, unknown>,
  kind: FeatureKind,
  sc: Scale,
): StartupFeatureDraft | null {
  const cx = fin(o.cx)
  const cy = fin(o.cy)
  const rx = fin(o.rx)
  const ry = fin(o.ry)
  if (cx === null || cy === null || rx === null || ry === null) return null
  return {
    kind,
    shape: {
      t: 'ellipse',
      cx: +sc.x(cx).toFixed(2),
      cy: +sc.y(cy).toFixed(2),
      rx: +clamp(sc.sw(Math.abs(rx)), 0.5, sc.w / 3).toFixed(2),
      ry: +clamp(sc.sh(Math.abs(ry)), 0.5, sc.h / 3).toFixed(2),
    },
  }
}

/**
 * Ответ модели → объекты плана в метрах участка.
 * Мусор на входе даёт пустой список, а не ошибку.
 */
export function mapVisionToFeatures(
  raw: unknown,
  width: number,
  height: number,
): StartupFeatureDraft[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return []
  const src = raw as Record<string, unknown>
  const sc = makeScale(detectMeters(src), width, height)
  const out: StartupFeatureDraft[] = []

  // Контур участка — газон-подложка свободной формы.
  const outline = pairList(src.outline)
  if (outline.length >= 3) {
    out.push({
      kind: 'lawn',
      shape: {
        t: 'poly',
        pts: outline
          .slice(0, 16)
          .map(([x, y]) => [+sc.x(x).toFixed(2), +sc.y(y).toFixed(2)] as [number, number]),
      },
    })
  }

  if (src.house && typeof src.house === 'object') {
    const house = rectDraft(src.house as Record<string, unknown>, 'house', sc, 2.5)
    if (house) out.push(house)
  }

  if (Array.isArray(src.buildings)) {
    for (const b of src.buildings.slice(0, 4)) {
      if (!b || typeof b !== 'object') continue
      const draft = rectDraft(b as Record<string, unknown>, 'building', sc, 1.5)
      if (draft) out.push(draft)
    }
  }

  if (Array.isArray(src.paths)) {
    for (const p of src.paths.slice(0, 6)) {
      if (!p || typeof p !== 'object') continue
      const pts = pairList((p as Record<string, unknown>).points)
      if (pts.length < 2) continue
      const wRaw = fin((p as Record<string, unknown>).width)
      const w = wRaw === null ? 0.8 : clamp(sc.s(Math.abs(wRaw)), 0.4, 2.5)
      out.push({
        kind: 'path',
        shape: {
          t: 'line',
          pts: pts
            .slice(0, 12)
            .map(([x, y]) => [+sc.x(x).toFixed(2), +sc.y(y).toFixed(2)] as [number, number]),
          w: +w.toFixed(2),
        },
      })
    }
  }

  if (Array.isArray(src.beds)) {
    for (const b of src.beds.slice(0, 12)) {
      if (!b || typeof b !== 'object') continue
      const bed = b as Record<string, unknown>
      const polyPts = pairList(bed.points)
      if (polyPts.length >= 3) {
        out.push({
          kind: 'bed',
          shape: {
            t: 'poly',
            pts: polyPts
              .slice(0, 12)
              .map(([x, y]) => [+sc.x(x).toFixed(2), +sc.y(y).toFixed(2)] as [number, number]),
          },
        })
        continue
      }
      const draft = ellipseDraft(bed, 'bed', sc)
      if (draft) out.push(draft)
    }
  }

  if (Array.isArray(src.trees)) {
    for (const t of src.trees.slice(0, 24)) {
      if (!t || typeof t !== 'object') continue
      const tree = t as Record<string, unknown>
      const cx = fin(tree.cx)
      const cy = fin(tree.cy)
      if (cx === null || cy === null) continue
      const rRaw = fin(tree.r)
      const r = rRaw === null ? 1.2 : clamp(sc.s(Math.abs(rRaw)), 0.4, 3)
      out.push({
        kind: 'tree',
        shape: {
          t: 'circle',
          cx: +sc.x(cx).toFixed(2),
          cy: +sc.y(cy).toFixed(2),
          r: +r.toFixed(2),
        },
      })
    }
  }

  if (Array.isArray(src.water)) {
    for (const w of src.water.slice(0, 3)) {
      if (!w || typeof w !== 'object') continue
      const draft = ellipseDraft(w as Record<string, unknown>, 'water', sc)
      if (draft) out.push(draft)
    }
  }

  return out
}

/**
 * Черновик без распознавания: рисуем прямо по точкам съёмки.
 * Углы дают контур, точка «от дома» — дом у ближнего края,
 * калитка и середина дорожки — главную дорожку.
 */
export function buildPointsFallback(
  shotIds: string[],
  width: number,
  height: number,
): StartupFeatureDraft[] {
  const out: StartupFeatureDraft[] = []
  const inset = clamp(Math.min(width, height) * 0.03, 0.25, 1)

  out.push({
    kind: 'lawn',
    shape: {
      t: 'poly',
      pts: [
        [+inset.toFixed(2), +inset.toFixed(2)],
        [+(width - inset).toFixed(2), +inset.toFixed(2)],
        [+(width - inset).toFixed(2), +(height - inset).toFixed(2)],
        [+inset.toFixed(2), +(height - inset).toFixed(2)],
      ],
    },
  })

  if (shotIds.includes('house')) {
    const stand = startupPointById('house')
    const w = clamp(width * 0.3, 3, width * 0.6)
    const h = clamp(height * 0.16, 2.5, height * 0.4)
    // Фотограф стоит у дома спиной к нему — сам дом чуть ближе к калитке.
    const cy = clamp(((stand?.y ?? 0.68) + 0.12) * height, h / 2, height - h / 2)
    const cx = clamp((stand?.x ?? 0.5) * width, w / 2, width - w / 2)
    out.push({
      kind: 'house',
      shape: {
        t: 'rect',
        x: +(cx - w / 2).toFixed(2),
        y: +(cy - h / 2).toFixed(2),
        w: +w.toFixed(2),
        h: +h.toFixed(2),
      },
    })
  }

  if (shotIds.includes('gate') || shotIds.includes('path')) {
    const gate = startupPointById('gate')
    const mid = startupPointById('path')
    out.push({
      kind: 'path',
      shape: {
        t: 'line',
        pts: [
          [+((gate?.x ?? 0.5) * width).toFixed(2), +((gate?.y ?? 0.94) * height).toFixed(2)],
          [+((mid?.x ?? 0.5) * width).toFixed(2), +((mid?.y ?? 0.42) * height).toFixed(2)],
        ],
        w: 0.8,
      },
    })
  }

  return out
}
