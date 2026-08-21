import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fileUrl, pb, pbError } from '../lib/pb'
import type { Entry, EntryType, Plant, Planting } from '../lib/types'
import {
  ENTRY_MENU,
  ENTRY_TYPES,
  FEATURE_KINDS,
  PLANT_TYPE_MENU,
  PLANT_TYPES,
  plantEmoji,
  STATUS_LABELS,
} from '../lib/catalog'
import { fmtDate, groupBy, toInputDate, todayISO, yearOf } from '../lib/dates'
import Sheet from '../ui/Sheet'
import PhotoInput from '../ui/PhotoInput'
import { toast } from '../ui/toast'

export default function PlantingPage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [planting, setPlanting] = useState<Planting | null>(null)
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    try {
      const [p, es] = await Promise.all([
        pb.collection('plantings').getOne<Planting>(id, { expand: 'plant,feature,plot' }),
        pb.collection('entries').getFullList<Entry>({
          filter: pb.filter('planting = {:id}', { id }),
          sort: '-happened_on,-created',
        }),
      ])
      setPlanting(p)
      setEntries(es)
    } catch {
      setNotFound(true)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (notFound) {
    return (
      <div className="page">
        <div className="empty">
          <span className="empty-emoji">🤷</span>
          <h2>Посадка не найдена</h2>
          <Link className="btn" to="/">
            На план
          </Link>
        </div>
      </div>
    )
  }

  if (!planting || entries === null) {
    return (
      <div className="page">
        <div className="spinner" />
      </div>
    )
  }

  const plant = planting.expand?.plant
  const plantName = plant?.name ?? planting.plant_name ?? 'Растение'
  const plantType = plant?.ptype ?? planting.plant_ptype ?? ''
  const feature = planting.expand?.feature
  const plot = planting.expand?.plot
  const byYear = groupBy(entries, (e) => String(yearOf(e.happened_on)))

  return (
    <div className="page">
      <div className="top-bar">
        <button className="icon-btn" aria-label="Назад" onClick={() => nav(-1)}>
          ←
        </button>
        <h1>
          {plantEmoji(plantType)} {plantName}
        </h1>
        <button className="icon-btn" aria-label="Изменить" onClick={() => setEditOpen(true)}>
          ✏️
        </button>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className={`badge badge--${planting.status}`}>{STATUS_LABELS[planting.status]}</span>
          {plant?.cultivar && <span className="badge">«{plant.cultivar}»</span>}
          {plantType && <span className="badge">{PLANT_TYPES[plantType as keyof typeof PLANT_TYPES]?.label}</span>}
        </div>
        <p className="muted">
          {planting.planted_on && <>Посажено: {fmtDate(planting.planted_on)}</>}
          {planting.ended_on && (
            <>
              <br />
              {planting.status === 'dead' ? 'Погибло' : 'Пересажено'}: {fmtDate(planting.ended_on)}
              {planting.end_note && ` — ${planting.end_note}`}
            </>
          )}
          {planting.author_email && (
            <>
              <br />
              Кто посадил(а): {planting.author_email}
            </>
          )}
        </p>
        <p className="muted">
          Место:{' '}
          {feature ? (
            <Link to={`/place/${feature.id}`}>
              {feature.label || FEATURE_KINDS[feature.kind].label}
            </Link>
          ) : (
            'на плане'
          )}
          {plot && (
            <>
              {' · '}
              <Link to={`/plot/${plot.id}`}>{plot.name}</Link>
            </>
          )}
        </p>
        {plant?.notes && <p style={{ whiteSpace: 'pre-wrap' }}>{plant.notes}</p>}
      </div>

      <button className="btn" onClick={() => setAddOpen(true)}>
        + Запись в журнал
      </button>

      {entries.length === 0 && (
        <div className="empty">
          <span className="empty-emoji">📖</span>
          <p>
            Журнал пуст. Отмечайте полив, цветение, обрезку, болезни —<br />
            через годы это спасёт от повторных ошибок.
          </p>
        </div>
      )}

      {byYear.map(([year, list]) => (
        <div key={year} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="year-head">{year}</div>
          {list.map((e) => (
            <EntryRow key={e.id} entry={e} onDelete={load} />
          ))}
        </div>
      ))}

      {addOpen && (
        <AddEntrySheet
          planting={planting}
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false)
            load()
          }}
        />
      )}

      {editOpen && (
        <EditPlantingSheet
          planting={planting}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false)
            load()
          }}
        />
      )}
    </div>
  )
}

function EntryRow({ entry, onDelete }: { entry: Entry; onDelete: () => void }) {
  const meta = ENTRY_TYPES[entry.etype]

  async function remove() {
    if (!confirm(`Удалить запись «${meta.label}» от ${fmtDate(entry.happened_on)}?`)) return
    try {
      await pb.collection('entries').delete(entry.id)
      onDelete()
    } catch (e) {
      toast(pbError(e))
    }
  }

  return (
    <div className="entry-row">
      <span className="entry-emoji">{meta.emoji}</span>
      <div className="entry-body">
        <div className="entry-head">
          <span className="entry-type">{meta.label}</span>
          <span className="entry-date">{fmtDate(entry.happened_on)}</span>
        </div>
        {entry.author_email && <p className="muted">Кто: {entry.author_email}</p>}
        {entry.note && <p className="entry-note">{entry.note}</p>}
        {entry.photos.length > 0 && (
          <div className="entry-photos">
            {entry.photos.map((ph) => (
              <a key={ph} href={fileUrl(entry, ph)} target="_blank" rel="noreferrer">
                <img src={fileUrl(entry, ph, '100x100')} alt="" />
              </a>
            ))}
          </div>
        )}
      </div>
      <button className="icon-btn" aria-label="Удалить запись" onClick={remove}>
        🗑️
      </button>
    </div>
  )
}

export function AddEntrySheet({
  planting,
  onClose,
  onSaved,
}: {
  planting: Planting
  onClose: () => void
  onSaved: () => void
}) {
  const [etype, setEtype] = useState<EntryType>('water')
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [busy, setBusy] = useState(false)

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const data = new FormData()
      data.set('planting', planting.id)
      data.set('etype', etype)
      data.set('happened_on', date)
      data.set('note', note)
      data.set('author_email', pb.authStore.record?.email ?? '')
      for (const f of photos) data.append('photos', f)
      try {
        await pb.collection('entries').create(data)
      } catch (e) {
        if ((e as { status?: number })?.status !== 400) throw e
        data.delete('author_email')
        await pb.collection('entries').create(data)
      }

      if (etype === 'death' && planting.status === 'growing') {
        await pb.collection('plantings').update(planting.id, {
          status: 'dead',
          ended_on: date,
          end_note: note,
        })
        toast('Отмечено: растение погибло. Оно останется в истории места.')
      }
      onSaved()
    } catch (err) {
      toast(pbError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title="Запись в журнал" onClose={onClose}>
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="etype-grid">
          {ENTRY_MENU.map((t) => (
            <button
              type="button"
              key={t}
              className={etype === t ? 'active' : ''}
              onClick={() => setEtype(t)}
            >
              <span className="e">{ENTRY_TYPES[t].emoji}</span>
              {ENTRY_TYPES[t].label}
            </button>
          ))}
        </div>
        <label className="field">
          <span>Когда</span>
          <input
            className="input"
            type="date"
            required
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Заметка</span>
          <textarea
            className="input"
            maxLength={4000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              etype === 'disease'
                ? 'Что случилось и чем обработали…'
                : etype === 'death'
                  ? 'Почему погибло? Вымерзло, вымокло, сгорело на солнце…'
                  : 'Пара слов на память…'
            }
          />
        </label>
        <div className="field">
          <span>Фото (до 5)</span>
          <PhotoInput files={photos} onChange={setPhotos} max={5} />
        </div>
        <button className="btn btn--block" disabled={busy}>
          {busy ? 'Сохраняем…' : 'Записать'}
        </button>
      </form>
    </Sheet>
  )
}

function EditPlantingSheet({
  planting,
  onClose,
  onSaved,
}: {
  planting: Planting
  onClose: () => void
  onSaved: () => void
}) {
  const nav = useNavigate()
  const [planted, setPlanted] = useState(toInputDate(planting.planted_on))
  const [status, setStatus] = useState(planting.status)
  const [plants, setPlants] = useState<Plant[] | null>(null)
  const [plantId, setPlantId] = useState(planting.plant)
  const [newPlantName, setNewPlantName] = useState('')
  const [newPlantType, setNewPlantType] = useState<string>(
    planting.expand?.plant?.ptype || planting.plant_ptype || 'perennial',
  )
  const [busy, setBusy] = useState(false)
  const creatingNew = plantId === '__new'

  useEffect(() => {
    pb.collection('plants')
      .getFullList<Plant>({ sort: 'name' })
      .then(setPlants)
      .catch((e) => {
        toast(pbError(e))
        setPlants([])
      })
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      let nextPlantId = plantId
      let nextPlantName = planting.expand?.plant?.name ?? planting.plant_name ?? 'Растение'
      let nextPlantType: string = planting.expand?.plant?.ptype ?? planting.plant_ptype ?? ''

      if (creatingNew) {
        if (!newPlantName.trim()) {
          toast('Напишите название нового растения.')
          return
        }
        const rec = await pb.collection('plants').create<Plant>({
          name: newPlantName.trim(),
          ptype: newPlantType,
          owner: pb.authStore.record?.id,
        })
        nextPlantId = rec.id
        nextPlantName = rec.name
        nextPlantType = rec.ptype || newPlantType
      } else {
        const picked = plants?.find((p) => p.id === plantId)
        if (picked) {
          nextPlantName = picked.name
          nextPlantType = picked.ptype || ''
        }
      }

      await pb.collection('plantings').update(planting.id, {
        planted_on: planted || null,
        status,
        plant: nextPlantId,
        plant_name: nextPlantName,
        plant_ptype: nextPlantType,
        ...(status === 'growing' ? { ended_on: null, end_note: '' } : {}),
      })
      onSaved()
    } catch (err) {
      toast(pbError(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (
      !confirm(
        'Удалить посадку вместе со всеми записями журнала? Обычно лучше отметить «Гибель» — так сохранится история.',
      )
    )
      return
    try {
      await pb.collection('plantings').delete(planting.id)
      nav(planting.plot ? `/plot/${planting.plot}` : '/', { replace: true })
    } catch (err) {
      toast(pbError(err))
    }
  }

  return (
    <Sheet title="Посадка" onClose={onClose}>
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label className="field">
          <span>Растение</span>
          {plants === null ? (
            <div className="spinner" style={{ margin: '6px auto' }} />
          ) : (
            <select className="input" value={plantId} onChange={(e) => setPlantId(e.target.value)}>
              {!plants.some((p) => p.id === plantId) && plantId !== '__new' && (
                <option value={plantId}>🌿 Текущее растение</option>
              )}
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {plantEmoji(p.ptype)} {p.name}
                  {p.cultivar ? ` «${p.cultivar}»` : ''}
                </option>
              ))}
              <option value="__new">+ Новое растение</option>
            </select>
          )}
        </label>
        {creatingNew && (
          <>
            <label className="field">
              <span>Название нового растения</span>
              <input
                className="input"
                maxLength={160}
                value={newPlantName}
                onChange={(e) => setNewPlantName(e.target.value)}
                placeholder="Например: Флокс белый"
              />
            </label>
            <label className="field">
              <span>Тип</span>
              <select className="input" value={newPlantType} onChange={(e) => setNewPlantType(e.target.value)}>
                {PLANT_TYPE_MENU.map((t) => (
                  <option key={t} value={t}>
                    {PLANT_TYPES[t].emoji} {PLANT_TYPES[t].label}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <label className="field">
          <span>Дата посадки</span>
          <input
            className="input"
            type="date"
            value={planted}
            max={todayISO()}
            onChange={(e) => setPlanted(e.target.value)}
          />
        </label>
        <label className="field">
          <span>Состояние</span>
          <select
            className="input"
            value={status}
            onChange={(e) => setStatus(e.target.value as Planting['status'])}
          >
            <option value="growing">🌱 Растёт</option>
            <option value="dead">🥀 Погибло</option>
            <option value="moved">🔁 Пересажено</option>
          </select>
        </label>
        <button className="btn btn--block" disabled={busy || plants === null}>
          Сохранить
        </button>
        <button type="button" className="btn btn--danger btn--block" onClick={remove}>
          Удалить посадку и журнал
        </button>
      </form>
    </Sheet>
  )
}
