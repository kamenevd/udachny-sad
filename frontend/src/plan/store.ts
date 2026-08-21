import { create } from 'zustand'
import { pb, pbError } from '../lib/pb'
import type { Feature, FeatureKind, Plant, Planting, Plot } from '../lib/types'
import type { Pt, Shape } from '../lib/geometry'
import { hitShape, keepInside, snapShape } from '../lib/geometry'
import { FEATURE_KINDS } from '../lib/catalog'
import { todayISO } from '../lib/dates'
import {
  buildPointsFallback,
  mapVisionToFeatures,
  type StartupFeatureDraft,
  type StartupPoint,
} from '../lib/startupSchema'
import { toast } from '../ui/toast'

export type Sel = { type: 'feature' | 'planting'; id: string } | null

export type Mode =
  | { m: 'view' }
  | { m: 'edit'; featureId: string; draft: Shape }
  | { m: 'add-feature'; kind: FeatureKind }
  | { m: 'add-planting'; plantId: string; plantName: string; plantPtype: string }
  | { m: 'move-planting'; plantingId: string }
  | { m: 'quick-plant'; photo: File } & QuickPlant

/** «Посадка одним касанием»: фото уже снято, осталось коснуться плана. */
export interface QuickPlant {
  /** Пустая строка — создать новое растение. */
  plantId: string
  plantName: string
  ptype: string
  /** У существующего растения уже есть фото — не перезаписываем. */
  plantHasPhoto: boolean
}

export interface StartupSchemaResult {
  requested: number
  created: number
  failed: number
  /** true — план по распознанным фото, false — черновик по точкам съёмки. */
  viaVision: boolean
  byKind: Partial<Record<FeatureKind, number>>
}

/** Снимок стартовой прогулки: точка съёмки + файл с камеры. */
export interface StartupShot {
  point: StartupPoint
  file: File
}

/** К чему привязывается посадка при размещении: приоритет клумба > изгородь > газон. */
const ANCHOR_KINDS: FeatureKind[] = ['bed', 'hedge', 'lawn']

function isBadRequest(e: unknown): boolean {
  return (e as { status?: number })?.status === 400
}

function findAnchor(features: Feature[], p: Pt): string {
  for (const kind of ANCHOR_KINDS) {
    const hit = features.find((f) => f.kind === kind && hitShape(f.shape, p))
    if (hit) return hit.id
  }
  return ''
}

function nextFeatureLabel(kind: FeatureKind, existing: Feature[]): string {
  const no = existing.filter((f) => f.kind === kind).length + 1
  const base = FEATURE_KINDS[kind].label
  return no === 1 ? base : `${base} ${no}`
}

async function createEntryWithPhoto(plantingId: string, photo: File, note: string) {
  const fd = new FormData()
  fd.set('planting', plantingId)
  fd.set('etype', 'note')
  fd.set('happened_on', todayISO())
  fd.set('note', note)
  fd.set('author_email', pb.authStore.record?.email ?? '')
  fd.append('photos', photo)
  try {
    await pb.collection('entries').create(fd)
  } catch (e) {
    if (!isBadRequest(e)) throw e
    fd.delete('author_email')
    await pb.collection('entries').create(fd)
  }
}

interface PlanState {
  plotId: string
  plot: Plot | null
  features: Feature[]
  plantings: Planting[]
  loading: boolean
  /** Идут тяжёлые операции: загрузка фото и пакетное сохранение. */
  saving: boolean
  savingText: string
  sel: Sel
  mode: Mode

  load: (plotId: string) => Promise<void>
  select: (sel: Sel) => void
  startEdit: (featureId: string) => void
  setDraft: (shape: Shape) => void
  commitEdit: () => Promise<void>
  cancelEdit: () => void
  startAddFeature: (kind: FeatureKind) => void
  startAddPlanting: (plantId: string, plantName: string, plantPtype: string) => void
  startQuickPlant: (photo: File, q: QuickPlant) => void
  runStartupSchema: (shots: StartupShot[]) => Promise<StartupSchemaResult>
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
  saving: false,
  savingText: '',
  sel: null,
  mode: { m: 'view' },

  async load(plotId) {
    set({
      plotId,
      loading: true,
      saving: false,
      savingText: '',
      sel: null,
      mode: { m: 'view' },
    })
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

  startAddPlanting: (plantId, plantName, plantPtype) =>
    set({ mode: { m: 'add-planting', plantId, plantName, plantPtype }, sel: null }),

  startQuickPlant: (photo, q) => set({ mode: { m: 'quick-plant', photo, ...q }, sel: null }),

  async runStartupSchema(shots) {
    const { plot, plotId } = get()
    const empty: StartupSchemaResult = {
      requested: 0,
      created: 0,
      failed: 0,
      viaVision: false,
      byKind: {},
    }
    if (!plot || shots.length === 0) return empty

    set({
      mode: { m: 'view' },
      sel: null,
      saving: true,
      savingText: 'Смотрим фото…',
    })

    // 1. Фото — в семейное хранилище сада, как и остальные снимки участка.
    const uploaded: Array<{ record: string; shot: StartupShot }> = []
    for (const shot of shots) {
      try {
        const fd = new FormData()
        fd.set('plot', plotId)
        fd.set('point', shot.point.id)
        fd.set('label', shot.point.label)
        fd.set('author_email', pb.authStore.record?.email ?? '')
        fd.set('photo', shot.file)
        let rec: { id: string }
        try {
          rec = await pb.collection('plot_photos').create(fd)
        } catch (e) {
          if (!isBadRequest(e)) throw e
          fd.delete('author_email')
          rec = await pb.collection('plot_photos').create(fd)
        }
        uploaded.push({ record: rec.id, shot })
      } catch {
        // Один снимок не загрузился — продолжаем с остальными.
      }
    }

    // 2. Сервер сам разбирает фото. Никаких вопросов человеку.
    let drafts: StartupFeatureDraft[] = []
    let viaVision = false
    if (uploaded.length > 0) {
      try {
        const res = await fetch('/api/vision/startup-schema', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token },
          body: JSON.stringify({
            plot: plotId,
            width: plot.width,
            height: plot.height,
            photos: uploaded.map(({ record, shot }) => ({
              record,
              point: shot.point.id,
              label: shot.point.label,
              stand: { x: shot.point.x, y: shot.point.y },
              facing: { x: shot.point.dx, y: shot.point.dy },
            })),
          }),
          signal: AbortSignal.timeout(120000),
        })
        if (res.ok) {
          const data = (await res.json()) as { ok?: boolean; vision?: unknown }
          if (data?.ok) {
            drafts = mapVisionToFeatures(data.vision, plot.width, plot.height)
            viaVision = drafts.length > 0
          }
        }
      } catch {
        // Распознавание недоступно — нарисуем по точкам съёмки.
      }
    }

    if (!viaVision) {
      drafts = buildPointsFallback(
        shots.map((s) => s.point.id),
        plot.width,
        plot.height,
      )
    }

    const createdFeatures: Feature[] = []
    const byKind: Partial<Record<FeatureKind, number>> = {}
    let failed = 0
    let snapshot = [...get().features]

    for (const draft of drafts) {
      try {
        const shape = snapShape(keepInside(draft.shape, plot.width, plot.height))
        const kind = draft.kind
        const label = nextFeatureLabel(kind, snapshot)
        const payload = {
          plot: plotId,
          kind,
          label,
          shape,
          z: 0,
          author_email: pb.authStore.record?.email ?? '',
        }
        let rec: Feature
        try {
          rec = await pb.collection('features').create<Feature>(payload)
        } catch (e) {
          if (!isBadRequest(e)) throw e
          rec = await pb.collection('features').create<Feature>({
            plot: plotId,
            kind,
            label,
            shape,
            z: 0,
          })
        }
        createdFeatures.push(rec)
        snapshot = [...snapshot, rec]
        byKind[kind] = (byKind[kind] ?? 0) + 1
      } catch {
        failed += 1
      }
    }

    const first = createdFeatures[0]
    set({
      features: [...get().features, ...createdFeatures],
      mode: { m: 'view' },
      sel: first ? { type: 'feature', id: first.id } : null,
      saving: false,
      savingText: '',
    })

    const out: StartupSchemaResult = {
      requested: drafts.length,
      created: createdFeatures.length,
      failed,
      viaVision,
      byKind,
    }

    if (out.created === 0) {
      toast('Не получилось нарисовать план. Попробуйте ещё раз.')
    } else if (!viaVision) {
      toast('Набросали по точкам съёмки, фото не разобрали')
    } else if (out.failed > 0) {
      toast(`План готов частично: ${out.created} из ${out.requested}.`)
    } else {
      toast(`План готов: добавили ${out.created} объектов. Всё можно поправить.`)
    }
    return out
  },

  startMovePlanting: (plantingId) => set({ mode: { m: 'move-planting', plantingId }, sel: null }),

  cancelMode: () => set({ mode: { m: 'view' } }),

  async placeAt(p) {
    const { mode, plot, features, plotId } = get()
    if (!plot) return

    if (mode.m === 'add-feature') {
      const shape = snapShape(keepInside(FEATURE_KINDS[mode.kind].makeShape(p), plot.width, plot.height))
      try {
        const payload = {
          plot: plotId,
          kind: mode.kind,
          label: '',
          shape,
          z: 0,
          author_email: pb.authStore.record?.email ?? '',
        }
        let rec: Feature
        try {
          rec = await pb.collection('features').create<Feature>(payload)
        } catch (e) {
          if (!isBadRequest(e)) throw e
          rec = await pb.collection('features').create<Feature>({
            plot: plotId,
            kind: mode.kind,
            label: '',
            shape,
            z: 0,
          })
        }
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
        const payload = {
          plot: plotId,
          plant: mode.plantId,
          feature,
          x: Math.round(p.x * 100) / 100,
          y: Math.round(p.y * 100) / 100,
          plant_name: mode.plantName,
          plant_ptype: mode.plantPtype,
          author_email: pb.authStore.record?.email ?? '',
          planted_on: todayISO(),
          status: 'growing',
        }
        let rec: Planting
        try {
          rec = await pb.collection('plantings').create<Planting>(payload, { expand: 'plant' })
        } catch (e) {
          if (!isBadRequest(e)) throw e
          rec = await pb.collection('plantings').create<Planting>(
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
        }
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

    if (mode.m === 'quick-plant') {
      const feature = findAnchor(features, p)
      set({ saving: true, savingText: 'Сажаем…' })
      let rec: Planting
      try {
        let plantId = mode.plantId
        if (!plantId) {
          const fd = new FormData()
          fd.set('name', mode.plantName)
          fd.set('ptype', mode.ptype)
          fd.set('owner', pb.authStore.record?.id ?? '')
          fd.set('photo', mode.photo)
          const plant = await pb.collection('plants').create<Plant>(fd)
          plantId = plant.id
        } else if (!mode.plantHasPhoto) {
          const fd = new FormData()
          fd.set('photo', mode.photo)
          await pb.collection('plants').update(plantId, fd)
        }
        try {
          rec = await pb.collection('plantings').create<Planting>(
            {
              plot: plotId,
              plant: plantId,
              feature,
              x: Math.round(p.x * 100) / 100,
              y: Math.round(p.y * 100) / 100,
              plant_name: mode.plantName,
              plant_ptype: mode.ptype,
              author_email: pb.authStore.record?.email ?? '',
              planted_on: todayISO(),
              status: 'growing',
            },
            { expand: 'plant' },
          )
        } catch (e) {
          if (!isBadRequest(e)) throw e
          rec = await pb.collection('plantings').create<Planting>(
            {
              plot: plotId,
              plant: plantId,
              feature,
              x: Math.round(p.x * 100) / 100,
              y: Math.round(p.y * 100) / 100,
              planted_on: todayISO(),
              status: 'growing',
            },
            { expand: 'plant' },
          )
        }
      } catch (e) {
        toast(pbError(e))
        set({ mode: { m: 'view' }, saving: false, savingText: '' })
        return
      }
      set({
        plantings: [...get().plantings, rec],
        mode: { m: 'view' },
        sel: { type: 'planting', id: rec.id },
      })
      try {
        await createEntryWithPhoto(rec.id, mode.photo, 'Посадили — первое фото.')
        toast(`«${mode.plantName}» растёт на плане, фото — в журнале 📖`)
      } catch {
        toast('Растение на плане, но фото в журнал не попало. Попробуйте добавить из журнала.')
      }
      set({ saving: false, savingText: '' })
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
