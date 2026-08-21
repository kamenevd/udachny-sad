import type { Shape } from './geometry'
import type { FeatureKind } from './types'

export type StartupPlotOutline = 'rect' | 'narrow' | 'l-shape' | 'free'
export type StartupHouseHint = 'none' | 'left' | 'center' | 'right' | 'far'
export type StartupFocus = 'none' | 'path' | 'bed' | 'trees'
export type StartupAreaHint =
  | 'center'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'unknown'
export type StartupSizeHint = 'small' | 'medium' | 'large'

export interface StartupPhotoPrompt {
  house: StartupHouseHint
  focus: StartupFocus
  area: StartupAreaHint
  size: StartupSizeHint
}

export interface StartupSchemaInput {
  width: number
  height: number
  outline: StartupPlotOutline
  photos: StartupPhotoPrompt[]
}

export interface StartupFeatureDraft {
  kind: FeatureKind
  shape: Shape
}

const SIZE_FACTOR: Record<StartupSizeHint, number> = {
  small: 0.82,
  medium: 1,
  large: 1.24,
}

const AREA_RATIO: Record<Exclude<StartupAreaHint, 'unknown'>, { x: number; y: number }> = {
  center: { x: 0.5, y: 0.5 },
  top: { x: 0.5, y: 0.2 },
  bottom: { x: 0.5, y: 0.8 },
  left: { x: 0.22, y: 0.5 },
  right: { x: 0.78, y: 0.5 },
  'top-left': { x: 0.22, y: 0.22 },
  'top-right': { x: 0.78, y: 0.22 },
  'bottom-left': { x: 0.22, y: 0.78 },
  'bottom-right': { x: 0.78, y: 0.78 },
}

const HOUSE_RATIO: Record<Exclude<StartupHouseHint, 'none'>, { x: number; y: number }> = {
  left: { x: 0.3, y: 0.28 },
  center: { x: 0.5, y: 0.3 },
  right: { x: 0.7, y: 0.28 },
  far: { x: 0.5, y: 0.16 },
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function clampPoint(x: number, y: number, width: number, height: number, pad = 0.6): { x: number; y: number } {
  return {
    x: clamp(x, pad, Math.max(pad, width - pad)),
    y: clamp(y, pad, Math.max(pad, height - pad)),
  }
}

function areaPoint(area: StartupAreaHint, width: number, height: number): { x: number; y: number } {
  const ratio = AREA_RATIO[area === 'unknown' ? 'center' : area]
  const pad = Math.min(Math.max(Math.min(width, height) * 0.06, 0.8), 2.4)
  return clampPoint(ratio.x * width, ratio.y * height, width, height, pad)
}

function offsetPoint(base: { x: number; y: number }, nth: number, width: number, height: number): { x: number; y: number } {
  const step = Math.max(Math.min(width, height) * 0.07, 0.55)
  const offsets: Array<[number, number]> = [
    [0, 0],
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, 1],
    [1, -1],
    [-1, -1],
  ]
  const [ox, oy] = offsets[nth % offsets.length]
  return clampPoint(base.x + ox * step, base.y + oy * step, width, height)
}

function houseDraft(input: StartupSchemaInput): StartupFeatureDraft | null {
  const hints = input.photos.filter((p) => p.house !== 'none')
  if (hints.length === 0) return null

  const avg = hints.reduce(
    (acc, p) => {
      const r = HOUSE_RATIO[p.house as Exclude<StartupHouseHint, 'none'>]
      acc.x += r.x
      acc.y += r.y
      acc.size += SIZE_FACTOR[p.size]
      return acc
    },
    { x: 0, y: 0, size: 0 },
  )

  const sizeFactor = avg.size / hints.length
  const center = clampPoint(
    (avg.x / hints.length) * input.width,
    (avg.y / hints.length) * input.height,
    input.width,
    input.height,
    1,
  )

  const widthBase = clamp(input.width * 0.26 * sizeFactor, 2.6, input.width * 0.55)
  const heightBase = clamp(input.height * 0.2 * sizeFactor, 2.2, input.height * 0.48)

  const sizeByOutline =
    input.outline === 'narrow'
      ? { w: widthBase * 0.85, h: heightBase * 1.08 }
      : input.outline === 'l-shape'
        ? { w: widthBase * 0.9, h: heightBase }
        : { w: widthBase, h: heightBase }

  const halfW = sizeByOutline.w / 2
  const halfH = sizeByOutline.h / 2
  const anchored = clampPoint(center.x, center.y, input.width, input.height, Math.max(halfW, halfH, 0.8))
  return {
    kind: 'house',
    shape: {
      t: 'rect',
      x: +(anchored.x - halfW).toFixed(2),
      y: +(anchored.y - halfH).toFixed(2),
      w: +sizeByOutline.w.toFixed(2),
      h: +sizeByOutline.h.toFixed(2),
    },
  }
}

function pathDraft(
  input: StartupSchemaInput,
  prompt: StartupPhotoPrompt,
  nthPath: number,
): StartupFeatureDraft {
  const base = areaPoint(prompt.area, input.width, input.height)
  const anchor = offsetPoint(base, nthPath, input.width, input.height)
  const sf = SIZE_FACTOR[prompt.size]
  const len = clamp(
    Math.min(input.width, input.height) * (input.outline === 'narrow' ? 0.48 : 0.34) * sf,
    2.4,
    Math.max(input.width, input.height) * 0.9,
  )
  const stroke = clamp(0.72 * sf, 0.45, 1.35)

  const fromCenterX = input.width / 2 - anchor.x
  const fromCenterY = input.height / 2 - anchor.y
  let dirX = 0
  let dirY = 0

  if (Math.abs(fromCenterX) < 0.4 && Math.abs(fromCenterY) < 0.4) {
    dirX = 1
    dirY = input.outline === 'narrow' ? 0 : 0.15
  } else if (Math.abs(fromCenterX) > Math.abs(fromCenterY)) {
    dirY = 1
  } else {
    dirX = 1
  }

  const norm = Math.hypot(dirX, dirY) || 1
  dirX /= norm
  dirY /= norm

  const a = clampPoint(anchor.x - dirX * (len / 2), anchor.y - dirY * (len / 2), input.width, input.height)
  const b = clampPoint(anchor.x + dirX * (len / 2), anchor.y + dirY * (len / 2), input.width, input.height)

  if (input.outline === 'l-shape' && prompt.size !== 'small') {
    const bend = clampPoint(anchor.x + dirY * 0.9, anchor.y - dirX * 0.9, input.width, input.height)
    return {
      kind: 'path',
      shape: {
        t: 'line',
        pts: [
          [+a.x.toFixed(2), +a.y.toFixed(2)],
          [+bend.x.toFixed(2), +bend.y.toFixed(2)],
          [+b.x.toFixed(2), +b.y.toFixed(2)],
        ],
        w: +stroke.toFixed(2),
      },
    }
  }

  return {
    kind: 'path',
    shape: {
      t: 'line',
      pts: [
        [+a.x.toFixed(2), +a.y.toFixed(2)],
        [+b.x.toFixed(2), +b.y.toFixed(2)],
      ],
      w: +stroke.toFixed(2),
    },
  }
}

function bedDraft(input: StartupSchemaInput, prompt: StartupPhotoPrompt, nthBed: number): StartupFeatureDraft {
  const base = areaPoint(prompt.area, input.width, input.height)
  const center = offsetPoint(base, nthBed, input.width, input.height)
  const sf = SIZE_FACTOR[prompt.size]
  const rx = clamp(input.width * 0.085 * sf, 0.75, input.width * 0.22)
  const ry = clamp(input.height * 0.075 * sf, 0.6, input.height * 0.2)
  return {
    kind: 'bed',
    shape: {
      t: 'ellipse',
      cx: +center.x.toFixed(2),
      cy: +center.y.toFixed(2),
      rx: +rx.toFixed(2),
      ry: +ry.toFixed(2),
    },
  }
}

function treeDrafts(input: StartupSchemaInput, prompt: StartupPhotoPrompt, nthTree: number): StartupFeatureDraft[] {
  const base = areaPoint(prompt.area, input.width, input.height)
  const sf = SIZE_FACTOR[prompt.size]
  const count = prompt.size === 'small' ? 1 : prompt.size === 'medium' ? 2 : 3
  const radius = clamp(Math.min(input.width, input.height) * 0.045 * sf, 0.55, 1.6)
  const spread = radius * 1.8
  const offsets: Array<[number, number]> = [
    [0, 0],
    [1, 0.5],
    [-1, 0.5],
    [0, -1],
  ]

  return Array.from({ length: count }, (_, i) => {
    const [ox, oy] = offsets[(nthTree + i) % offsets.length]
    const center = clampPoint(base.x + ox * spread, base.y + oy * spread, input.width, input.height, radius + 0.4)
    return {
      kind: 'tree' as const,
      shape: {
        t: 'circle' as const,
        cx: +center.x.toFixed(2),
        cy: +center.y.toFixed(2),
        r: +radius.toFixed(2),
      },
    }
  })
}

export function hasStartupSignals(photos: StartupPhotoPrompt[]): boolean {
  return photos.some((p) => p.house !== 'none' || p.focus !== 'none')
}

/**
 * Черновик стартовой схемы:
 * - дом по подсказкам «где дом на фото»
 * - дорожки/клумбы/деревья по выбору пользователя в каждом фото.
 */
export function buildStartupSchema(input: StartupSchemaInput): StartupFeatureDraft[] {
  const out: StartupFeatureDraft[] = []
  const house = houseDraft(input)
  if (house) out.push(house)

  let pathNo = 0
  let bedNo = 0
  let treeNo = 0

  for (const prompt of input.photos) {
    if (prompt.focus === 'path') {
      out.push(pathDraft(input, prompt, pathNo))
      pathNo += 1
      continue
    }
    if (prompt.focus === 'bed') {
      out.push(bedDraft(input, prompt, bedNo))
      bedNo += 1
      continue
    }
    if (prompt.focus === 'trees') {
      const trees = treeDrafts(input, prompt, treeNo)
      out.push(...trees)
      treeNo += trees.length
    }
  }

  return out
}
