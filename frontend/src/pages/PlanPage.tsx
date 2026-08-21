import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { pb, pbError, setLastPlot } from '../lib/pb'
import type { Plant } from '../lib/types'
import { ENTRY_TYPES, FEATURE_KINDS, KIND_MENU, PLANT_TYPE_MENU, PLANT_TYPES, plantEmoji } from '../lib/catalog'
import { extendLine, shrinkLine } from '../lib/geometry'
import { fmtDate, todayISO, yearOf } from '../lib/dates'
import Sheet from '../ui/Sheet'
import { toast } from '../ui/toast'
import { usePlan } from '../plan/store'
import PlanCanvas from '../plan/PlanCanvas'

export default function PlanPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const { plot, features, plantings, loading, sel, mode, load } = usePlan()
  const [addOpen, setAddOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [renameId, setRenameId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLastPlot(id)
    load(id)
  }, [id, load])

  if (loading) {
    return (
      <div className="page page--plan">
        <div className="spinner" style={{ position: 'absolute', inset: 0, margin: 'auto' }} />
      </div>
    )
  }

  if (!plot) {
    return (
      <div className="page">
        <div className="empty">
          <span className="empty-emoji">🤷</span>
          <h2>Участок не найден</h2>
          <Link className="btn" to="/plots">
            К списку участков
          </Link>
        </div>
      </div>
    )
  }

  const selFeature =
    sel?.type === 'feature' ? features.find((f) => f.id === sel.id) ?? null : null
  const selPlanting =
    sel?.type === 'planting' ? plantings.find((p) => p.id === sel.id) ?? null : null
  const showFab = mode.m === 'view' && !sel

  return (
    <div className="page page--plan">
      <PlanCanvas />

      {/* Шапка */}
      {mode.m === 'view' && (
        <div className="plan-top">
          <button className="plan-title" onClick={() => nav('/plots')}>
            🏡 {plot.name} · {plot.width}×{plot.height} м
          </button>
        </div>
      )}

      {/* Подсказки режимов размещения */}
      {mode.m === 'add-feature' && (
        <ModeHint text={`Коснитесь плана — там появится «${FEATURE_KINDS[mode.kind].label}»`} />
      )}
      {mode.m === 'add-planting' && (
        <ModeHint text={`Коснитесь плана — куда посадить «${mode.plantName}»`} />
      )}
      {mode.m === 'move-planting' && <ModeHint text="Коснитесь нового места на плане" />}

      {/* Кнопка добавления */}
      {showFab && (
        <button className="fab" aria-label="Добавить" onClick={() => setAddOpen(true)}>
          +
        </button>
      )}

      {/* Панели выбранного */}
      {mode.m === 'edit' && <EditPanel />}
      {mode.m === 'view' && selFeature && (
        <FeaturePanel
          featureId={selFeature.id}
          onPlant={() => setPickerOpen(true)}
          onRename={() => setRenameId(selFeature.id)}
        />
      )}
      {mode.m === 'view' && selPlanting && <PlantingPanel plantingId={selPlanting.id} />}

      {/* Лист «Добавить» */}
      {addOpen && (
        <Sheet title="Добавить на план" onClose={() => setAddOpen(false)}>
          <button
            className="btn btn--secondary btn--block"
            onClick={() => {
              setAddOpen(false)
              setPickerOpen(true)
            }}
          >
            🌷 Посадить растение
          </button>
          <div className="section-title">Объекты участка</div>
          <div className="etype-grid">
            {KIND_MENU.map((k) => (
              <button
                key={k}
                onClick={() => {
                  setAddOpen(false)
                  usePlan.getState().startAddFeature(k)
                }}
              >
                <span className="e">{FEATURE_KINDS[k].emoji}</span>
                {FEATURE_KINDS[k].label}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {pickerOpen && <PlantPicker onClose={() => setPickerOpen(false)} />}

      {renameId && <RenameSheet featureId={renameId} onClose={() => setRenameId(null)} />}
    </div>
  )
}

function ModeHint({ text }: { text: string }) {
  return (
    <div className="plan-hint">
      <span style={{ flex: 1 }}>{text}</span>
      <button className="btn btn--secondary" onClick={() => usePlan.getState().cancelMode()}>
        Отмена
      </button>
    </div>
  )
}

function EditPanel() {
  const { mode, features } = usePlan()
  if (mode.m !== 'edit') return null
  const feature = features.find((f) => f.id === mode.featureId)
  const draft = mode.draft
  const isLine = draft.t === 'line'

  return (
    <div className="plan-panel">
      <h3>
        {feature ? `${FEATURE_KINDS[feature.kind].emoji} ${feature.label || FEATURE_KINDS[feature.kind].label}` : ''}
        <span className="muted"> — потяните за точки или перетащите целиком</span>
      </h3>
      {isLine && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="muted">Ширина: {draft.w.toFixed(1)} м</span>
          <button
            className="btn btn--secondary btn--small"
            onClick={() =>
              usePlan.getState().setDraft({ ...draft, w: Math.max(0.2, +(draft.w - 0.2).toFixed(1)) })
            }
          >
            −
          </button>
          <button
            className="btn btn--secondary btn--small"
            onClick={() =>
              usePlan.getState().setDraft({ ...draft, w: Math.min(3, +(draft.w + 0.2).toFixed(1)) })
            }
          >
            +
          </button>
          <button
            className="btn btn--secondary btn--small"
            onClick={() => usePlan.getState().setDraft(extendLine(draft))}
          >
            + Точка
          </button>
          {draft.pts.length > 2 && (
            <button
              className="btn btn--secondary btn--small"
              onClick={() => usePlan.getState().setDraft(shrinkLine(draft))}
            >
              − Точка
            </button>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" style={{ flex: 1 }} onClick={() => usePlan.getState().commitEdit()}>
          Готово
        </button>
        <button className="btn btn--ghost" onClick={() => usePlan.getState().cancelEdit()}>
          Отмена
        </button>
      </div>
    </div>
  )
}

function FeaturePanel({
  featureId,
  onPlant,
  onRename,
}: {
  featureId: string
  onPlant: () => void
  onRename: () => void
}) {
  const nav = useNavigate()
  const { features, plantings } = usePlan()
  const f = features.find((x) => x.id === featureId)
  if (!f) return null
  const meta = FEATURE_KINDS[f.kind]
  const here = plantings.filter((p) => p.feature === f.id)
  const growing = here.filter((p) => p.status === 'growing').length
  const past = here.length - growing

  async function remove() {
    if (!f) return
    const what = f.label || meta.label
    if (!confirm(`Убрать «${what}» с плана? Посадки и журнал останутся.`)) return
    await usePlan.getState().deleteFeature(f.id)
  }

  return (
    <div className="plan-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28 }}>{meta.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3>{f.label || meta.label}</h3>
          <p className="muted">
            {meta.label}
            {growing > 0 && ` · растёт: ${growing}`}
            {past > 0 && ` · в истории: ${past}`}
          </p>
        </div>
        <button className="icon-btn" aria-label="Закрыть" onClick={() => usePlan.getState().select(null)}>
          ✕
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn--small" onClick={onPlant}>
          🌷 Посадить
        </button>
        <button className="btn btn--secondary btn--small" onClick={() => nav(`/place/${f.id}`)}>
          📜 История места
        </button>
        <button
          className="btn btn--secondary btn--small"
          onClick={() => usePlan.getState().startEdit(f.id)}
        >
          ✏️ Форма
        </button>
        <button className="btn btn--secondary btn--small" onClick={onRename}>
          Название
        </button>
        <button className="btn btn--danger btn--small" onClick={remove}>
          Убрать
        </button>
      </div>
    </div>
  )
}

function PlantingPanel({ plantingId }: { plantingId: string }) {
  const nav = useNavigate()
  const { plantings } = usePlan()
  const p = plantings.find((x) => x.id === plantingId)
  if (!p) return null
  const plant = p.expand?.plant
  const year = p.planted_on ? yearOf(p.planted_on) : null

  async function quickWater() {
    if (!p) return
    try {
      await pb.collection('entries').create({
        planting: p.id,
        etype: 'water',
        happened_on: todayISO(),
        note: '',
      })
      toast(`💧 Полив записан — ${fmtDate(todayISO())}`)
    } catch (e) {
      toast(pbError(e))
    }
  }

  return (
    <div className="plan-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28 }}>{plantEmoji(plant?.ptype ?? '')}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3>{plant?.name ?? 'Растение'}</h3>
          <p className="muted">
            {plant?.cultivar ? `«${plant.cultivar}» · ` : ''}
            {plant?.ptype ? PLANT_TYPES[plant.ptype].label : ''}
            {year ? ` · с ${year} года` : ''}
          </p>
        </div>
        <button className="icon-btn" aria-label="Закрыть" onClick={() => usePlan.getState().select(null)}>
          ✕
        </button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn--small" onClick={() => nav(`/planting/${p.id}`)}>
          📖 Журнал
        </button>
        <button className="btn btn--secondary btn--small" onClick={quickWater}>
          {ENTRY_TYPES.water.emoji} Полил(а)
        </button>
        <button
          className="btn btn--secondary btn--small"
          onClick={() => usePlan.getState().startMovePlanting(p.id)}
        >
          ↔️ Переместить
        </button>
      </div>
    </div>
  )
}

function PlantPicker({ onClose }: { onClose: () => void }) {
  const [plants, setPlants] = useState<Plant[] | null>(null)
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('perennial')

  useEffect(() => {
    pb.collection('plants')
      .getFullList<Plant>({ sort: 'name' })
      .then(setPlants)
      .catch((e) => {
        toast(pbError(e))
        setPlants([])
      })
  }, [])

  const filtered = (plants ?? []).filter((p) =>
    (p.name + ' ' + p.cultivar).toLowerCase().includes(q.toLowerCase()),
  )

  function pick(p: Plant) {
    usePlan.getState().startAddPlanting(p.id, p.name)
    onClose()
  }

  async function createPlant(e: React.FormEvent) {
    e.preventDefault()
    try {
      const rec = await pb.collection('plants').create<Plant>({
        name: newName.trim(),
        ptype: newType,
        owner: pb.authStore.record?.id,
      })
      pick(rec)
    } catch (err) {
      toast(pbError(err))
    }
  }

  return (
    <Sheet title="Что посадить?" onClose={onClose}>
      {!creating && (
        <>
          <input
            className="input"
            placeholder="Поиск по названию…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {plants === null && <div className="spinner" />}
          {plants !== null && (
            <div className="list">
              {filtered.map((p) => (
                <button key={p.id} className="row" onClick={() => pick(p)}>
                  <span className="row-emoji">{plantEmoji(p.ptype)}</span>
                  <div className="row-body">
                    <div className="row-title">{p.name}</div>
                    {p.cultivar && <div className="row-sub">«{p.cultivar}»</div>}
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="muted" style={{ textAlign: 'center', padding: '12px 0' }}>
                  Ничего не нашлось
                </p>
              )}
            </div>
          )}
          <button
            className="btn btn--secondary btn--block"
            onClick={() => {
              setNewName(q)
              setCreating(true)
            }}
          >
            + Новое растение
          </button>
        </>
      )}
      {creating && (
        <form onSubmit={createPlant} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label className="field">
            <span>Название</span>
            <input
              className="input"
              required
              maxLength={160}
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Например: Гортензия метельчатая"
            />
          </label>
          <label className="field">
            <span>Тип</span>
            <select className="input" value={newType} onChange={(e) => setNewType(e.target.value)}>
              {PLANT_TYPE_MENU.map((t) => (
                <option key={t} value={t}>
                  {PLANT_TYPES[t].emoji} {PLANT_TYPES[t].label}
                </option>
              ))}
            </select>
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn" style={{ flex: 1 }}>
              Добавить и посадить
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setCreating(false)}>
              Назад
            </button>
          </div>
        </form>
      )}
    </Sheet>
  )
}

function RenameSheet({ featureId, onClose }: { featureId: string; onClose: () => void }) {
  const { features } = usePlan()
  const f = features.find((x) => x.id === featureId)
  const [value, setValue] = useState(f?.label ?? '')
  if (!f) return null

  return (
    <Sheet title="Название места" onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          await usePlan.getState().renameFeature(featureId, value.trim())
          onClose()
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <input
          className="input"
          maxLength={120}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Например: ${f.kind === 'bed' ? 'Клумба у крыльца' : 'Южный угол'}`}
        />
        <button className="btn btn--block">Сохранить</button>
      </form>
    </Sheet>
  )
}
