import { create } from 'zustand'
import { pb, pbError } from '../lib/pb'
import type { Feature, FeatureKind, Planting, Plot } from '../lib/types'
import type { Pt, Shape } from '../lib/geometry'
import { hitShape, keepInside, snapShape } from '../lib/geometry'
import { FEATURE_KINDS } from '../lib/catalog'
import { todayISO } from '../lib/dates'
import { toast } from '../ui/toast'

export type Sel = { type: 'feature' | 'planting'; id: string } | null

export type Mode =
  | { m: 'view' }
  | { m: 'edit'; featureId: string; draft: Shape }
  | { m: 'add-feature'; kind: FeatureKind }
  | { m: 'add-planting'; plantId: string; plantName: string }
  | { m: 'move-planting'; plantingId: string }

/** К чему привязывается посадка при размещении: приоритет клумба > изгородь > газон. */
const ANCHOR_KINDS: FeatureKind[] = ['bed', 'hedge', 'lawn']

function findAnchor(features: Feature[], p: Pt): string {
  for (const kind of ANCHOR_KINDS) {
    const hit = features.find((f) => f.kind === kind && hitShape(f.shape, p))
    if (hit) return hit.id
  }
  return ''
}

interface PlanState {
  plotId: string
  plot: Plot | null
  features: Feature[]
  plantings: Planting[]
  loading: boolean
  sel: Sel
  mode: Mode

  load: (plotId: string) => Promise<void>
  select: (sel: Sel) => void
  startEdit: (featureId: string) => void
  setDraft: (shape: Shape) => void
  commitEdit: () => Promise<void>
  cancelEdit: () => void
  startAddFeature: (kind: FeatureKind) => void
  startAddPlanting: (plantId: string, plantName: string) => void
  startMovePlanting: (plantingId: string) => void
  cancelMode: () => void
  placeAt: (p: Pt) => Promise<void>
  renameFeature: (id: string, label: string) => Promise<void>
  deleteFeature: (id: string) => Promise<void>
}

export const usePlan = create<PlanState>((set, get) => ({
  plotId: '',
  plot: null,
  features: [],
  plantings: [],
  loading: true,
  sel: null,
  mode: { m: 'view' },

  async load(plotId) {
    set({ plotId, loading: true, sel: null, mode: { m: 'view' } })
    try {
      const [plot, features, plantings] = await Promise.all([
        pb.collection('plots').getOne<Plot>(plotId),
        pb
          .collection('features')
          .getFullList<Feature>({ filter: pb.filter('plot = {:p}', { p: plotId }), sort: 'created' }),
        pb.collection('plantings').getFullList<Planting>({
          filter: pb.filter('plot = {:p}', { p: plotId }),
          expand: 'plant',
          sort: 'created',
        }),
      ])
      if (get().plotId !== plotId) return
      set({ plot, features, plantings, loading: false })
    } catch (e) {
      toast(pbError(e))
      set({ loading: false })
    }
  },

  select: (sel) => set({ sel, mode: { m: 'view' } }),

  startEdit(featureId) {
    const f = get().features.find((x) => x.id === featureId)
    if (!f) return
    set({ mode: { m: 'edit', featureId, draft: f.shape }, sel: { type: 'feature', id: featureId } })
  },

  setDraft(shape) {
    const { mode } = get()
    if (mode.m !== 'edit') return
    set({ mode: { ...mode, draft: shape } })
  },

  async commitEdit() {
    const { mode, features } = get()
    if (mode.m !== 'edit') return
    const shape = snapShape(mode.draft)
    set({
      features: features.map((f) => (f.id === mode.featureId ? { ...f, shape } : f)),
      mode: { m: 'view' },
    })
    try {
      await pb.collection('features').update(mode.featureId, { shape })
    } catch (e) {
      toast(pbError(e))
    }
  },

  cancelEdit: () => set({ mode: { m: 'view' } }),

  startAddFeature: (kind) => set({ mode: { m: 'add-feature', kind }, sel: null }),

  startAddPlanting: (plantId, plantName) =>
    set({ mode: { m: 'add-planting', plantId, plantName }, sel: null }),

  startMovePlanting: (plantingId) => set({ mode: { m: 'move-planting', plantingId }, sel: null }),

  cancelMode: () => set({ mode: { m: 'view' } }),

  async placeAt(p) {
    const { mode, plot, features, plotId } = get()
    if (!plot) return

    if (mode.m === 'add-feature') {
      const shape = snapShape(keepInside(FEATURE_KINDS[mode.kind].makeShape(p), plot.width, plot.height))
      try {
        const rec = await pb.collection('features').create<Feature>({
          plot: plotId,
          kind: mode.kind,
          label: '',
          shape,
          z: 0,
        })
        set({
          features: [...get().features, rec],
          mode: { m: 'edit', featureId: rec.id, draft: rec.shape },
          sel: { type: 'feature', id: rec.id },
        })
      } catch (e) {
        toast(pbError(e))
        set({ mode: { m: 'view' } })
      }
      return
    }

    if (mode.m === 'add-planting') {
      const feature = findAnchor(features, p)
      try {
        const rec = await pb.collection('plantings').create<Planting>(
          {
            plot: plotId,
            plant: mode.plantId,
            feature,
            x: Math.round(p.x * 100) / 100,
            y: Math.round(p.y * 100) / 100,
            planted_on: todayISO(),
            status: 'growing',
          },
          { expand: 'plant' },
        )
        set({
          plantings: [...get().plantings, rec],
          mode: { m: 'view' },
          sel: { type: 'planting', id: rec.id },
        })
        toast(`«${mode.plantName}» на плане. Дату посадки можно изменить в журнале.`)
      } catch (e) {
        toast(pbError(e))
        set({ mode: { m: 'view' } })
      }
      return
    }

    if (mode.m === 'move-planting') {
      const feature = findAnchor(features, p)
      const x = Math.round(p.x * 100) / 100
      const y = Math.round(p.y * 100) / 100
      set({
        plantings: get().plantings.map((pl) =>
          pl.id === mode.plantingId ? { ...pl, x, y, feature } : pl,
        ),
        mode: { m: 'view' },
        sel: { type: 'planting', id: mode.plantingId },
      })
      try {
        await pb.collection('plantings').update(mode.plantingId, { x, y, feature })
      } catch (e) {
        toast(pbError(e))
      }
    }
  },

  async renameFeature(id, label) {
    set({ features: get().features.map((f) => (f.id === id ? { ...f, label } : f)) })
    try {
      await pb.collection('features').update(id, { label })
    } catch (e) {
      toast(pbError(e))
    }
  },

  async deleteFeature(id) {
    try {
      // Убираем привязку посадок к удаляемому месту (сами посадки остаются).
      const linked = get().plantings.filter((pl) => pl.feature === id)
      await Promise.all(
        linked.map((pl) => pb.collection('plantings').update(pl.id, { feature: '' })),
      )
      await pb.collection('features').delete(id)
      set({
        features: get().features.filter((f) => f.id !== id),
        plantings: get().plantings.map((pl) => (pl.feature === id ? { ...pl, feature: '' } : pl)),
        sel: null,
        mode: { m: 'view' },
      })
    } catch (e) {
      toast(pbError(e))
    }
  },
}))
