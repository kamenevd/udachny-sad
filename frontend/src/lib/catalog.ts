import type { Pt, Shape } from './geometry'
import type { EntryType, FeatureKind, PlantType } from './types'

interface KindMeta {
  label: string
  emoji: string
  /** Порядок отрисовки: меньше — ниже. */
  order: number
  makeShape: (at: Pt) => Shape
}

export const FEATURE_KINDS: Record<FeatureKind, KindMeta> = {
  lawn: {
    label: 'Газон',
    emoji: '🟩',
    order: 0,
    makeShape: (at) => ({ t: 'rect', x: at.x - 3, y: at.y - 2, w: 6, h: 4 }),
  },
  water: {
    label: 'Водоём',
    emoji: '💧',
    order: 1,
    makeShape: (at) => ({ t: 'ellipse', cx: at.x, cy: at.y, rx: 1.5, ry: 1 }),
  },
  path: {
    label: 'Дорожка',
    emoji: '🐾',
    order: 2,
    makeShape: (at) => ({
      t: 'line',
      pts: [
        [at.x - 2, at.y],
        [at.x + 2, at.y],
      ],
      w: 0.8,
    }),
  },
  bed: {
    label: 'Клумба',
    emoji: '🌸',
    order: 3,
    makeShape: (at) => ({ t: 'ellipse', cx: at.x, cy: at.y, rx: 1.5, ry: 1 }),
  },
  hedge: {
    label: 'Изгородь',
    emoji: '🌿',
    order: 4,
    makeShape: (at) => ({
      t: 'line',
      pts: [
        [at.x - 2, at.y],
        [at.x + 2, at.y],
      ],
      w: 0.6,
    }),
  },
  house: {
    label: 'Дом',
    emoji: '🏠',
    order: 5,
    makeShape: (at) => ({ t: 'rect', x: at.x - 4, y: at.y - 3, w: 8, h: 6 }),
  },
  building: {
    label: 'Постройка',
    emoji: '🛖',
    order: 6,
    makeShape: (at) => ({ t: 'rect', x: at.x - 1.5, y: at.y - 1, w: 3, h: 2 }),
  },
  tree: {
    label: 'Дерево',
    emoji: '🌳',
    order: 7,
    makeShape: (at) => ({ t: 'circle', cx: at.x, cy: at.y, r: 1.5 }),
  },
  shrub: {
    label: 'Куст',
    emoji: '🌱',
    order: 8,
    makeShape: (at) => ({ t: 'circle', cx: at.x, cy: at.y, r: 0.75 }),
  },
}

/** Порядок в меню добавления. */
export const KIND_MENU: FeatureKind[] = [
  'house',
  'building',
  'bed',
  'tree',
  'shrub',
  'hedge',
  'path',
  'lawn',
  'water',
]

interface EntryMeta {
  label: string
  emoji: string
}

export const ENTRY_TYPES: Record<EntryType, EntryMeta> = {
  water: { label: 'Полив', emoji: '💧' },
  bloom: { label: 'Цветение', emoji: '🌸' },
  prune: { label: 'Обрезка', emoji: '✂️' },
  feed: { label: 'Подкормка', emoji: '🌿' },
  disease: { label: 'Болезнь', emoji: '🐛' },
  shelter: { label: 'Укрытие на зиму', emoji: '❄️' },
  replant: { label: 'Пересадка', emoji: '🔁' },
  death: { label: 'Гибель', emoji: '🥀' },
  note: { label: 'Заметка', emoji: '📝' },
}

export const ENTRY_MENU: EntryType[] = [
  'water',
  'bloom',
  'prune',
  'feed',
  'disease',
  'shelter',
  'replant',
  'death',
  'note',
]

interface PlantTypeMeta {
  label: string
  emoji: string
}

export const PLANT_TYPES: Record<PlantType, PlantTypeMeta> = {
  perennial: { label: 'Многолетник', emoji: '🌷' },
  shrub: { label: 'Кустарник', emoji: '🌱' },
  tree: { label: 'Дерево', emoji: '🌳' },
  conifer: { label: 'Хвойное', emoji: '🌲' },
  bulb: { label: 'Луковичное', emoji: '🌻' },
  annual: { label: 'Однолетник', emoji: '🌼' },
  vine: { label: 'Лиана', emoji: '🍃' },
  grass: { label: 'Злак', emoji: '🌾' },
}

export const PLANT_TYPE_MENU: PlantType[] = [
  'perennial',
  'shrub',
  'tree',
  'conifer',
  'bulb',
  'annual',
  'vine',
  'grass',
]

export function plantEmoji(ptype: string): string {
  return PLANT_TYPES[ptype as PlantType]?.emoji ?? '🌿'
}

export const STATUS_LABELS: Record<string, string> = {
  growing: 'Растёт',
  dead: 'Погибло',
  moved: 'Пересажено',
}
