import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { pb } from '../lib/pb'
import type { Entry, Feature, Planting } from '../lib/types'
import { ENTRY_TYPES, FEATURE_KINDS, plantEmoji, STATUS_LABELS } from '../lib/catalog'
import { fmtDateShort, yearOf } from '../lib/dates'

/** История места: что росло здесь по годам и что с ним происходило. */
export default function PlacePage() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const [feature, setFeature] = useState<Feature | null>(null)
  const [plantings, setPlantings] = useState<Planting[] | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return
    ;(async () => {
      try {
        const f = await pb.collection('features').getOne<Feature>(id)
        const pls = await pb.collection('plantings').getFullList<Planting>({
          filter: pb.filter('feature = {:id}', { id }),
          expand: 'plant',
          sort: '-created',
        })
        setFeature(f)
        setPlantings(pls)
        if (pls.length > 0) {
          const filter = pls.map((p) => pb.filter('planting = {:id}', { id: p.id })).join(' || ')
          setEntries(
            await pb.collection('entries').getFullList<Entry>({ filter, sort: '-happened_on' }),
          )
        }
      } catch {
        setNotFound(true)
      }
    })()
  }, [id])

  if (notFound) {
    return (
      <div className="page">
        <div className="empty">
          <span className="empty-emoji">🤷</span>
          <h2>Место не найдено</h2>
          <Link className="btn" to="/">
            На план
          </Link>
        </div>
      </div>
    )
  }

  if (!feature || plantings === null) {
    return (
      <div className="page">
        <div className="spinner" />
      </div>
    )
  }

  const meta = FEATURE_KINDS[feature.kind]
  const growing = plantings.filter((p) => p.status === 'growing')
  const past = plantings.filter((p) => p.status !== 'growing')

  // Годы: от посадки самой старой до текущего года — сводка событий по годам.
  const entriesByYear = new Map<number, Entry[]>()
  for (const e of entries) {
    const y = yearOf(e.happened_on)
    const arr = entriesByYear.get(y) ?? []
    arr.push(e)
    entriesByYear.set(y, arr)
  }
  const years = [...entriesByYear.keys()].sort((a, b) => b - a)
  const plantingById = new Map(plantings.map((p) => [p.id, p]))

  return (
    <div className="page">
      <div className="top-bar">
        <button className="icon-btn" aria-label="Назад" onClick={() => nav(-1)}>
          ←
        </button>
        <h1>
          {meta.emoji} {feature.label || meta.label}
        </h1>
      </div>
      <p className="muted">История этого места по годам — что росло и что происходило.</p>

      {plantings.length === 0 && (
        <div className="empty">
          <span className="empty-emoji">🌱</span>
          <p>
            Здесь пока ничего не сажали.
            <br />
            Выберите это место на плане и нажмите «Посадить».
          </p>
        </div>
      )}

      {growing.length > 0 && (
        <>
          <div className="section-title">Сейчас растёт</div>
          <div className="list">
            {growing.map((p) => (
              <PlantingRow key={p.id} p={p} />
            ))}
          </div>
        </>
      )}

      {past.length > 0 && (
        <>
          <div className="section-title">Росло раньше</div>
          <div className="list">
            {past.map((p) => (
              <PlantingRow key={p.id} p={p} />
            ))}
          </div>
        </>
      )}

      {years.length > 0 && <div className="section-title">Летопись</div>}
      {years.map((year) => (
        <div key={year} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="year-head">{year}</div>
          {entriesByYear.get(year)!.map((e) => {
            const p = plantingById.get(e.planting)
            const em = ENTRY_TYPES[e.etype]
            const plantName = p?.expand?.plant?.name ?? p?.plant_name ?? 'Растение'
            return (
              <Link
                key={e.id}
                to={`/planting/${e.planting}`}
                className="entry-row"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <span className="entry-emoji">{em.emoji}</span>
                <div className="entry-body">
                  <div className="entry-head">
                    <span className="entry-type">
                      {plantName} — {em.label.toLowerCase()}
                    </span>
                    <span className="entry-date">{fmtDateShort(e.happened_on)}</span>
                  </div>
                  {e.author_email && <p className="muted">Кто: {e.author_email}</p>}
                  {e.note && <p className="entry-note">{e.note}</p>}
                </div>
              </Link>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function PlantingRow({ p }: { p: Planting }) {
  const plant = p.expand?.plant
  const plantName = plant?.name ?? p.plant_name ?? 'Растение'
  const plantType = plant?.ptype ?? p.plant_ptype ?? ''
  const from = p.planted_on ? yearOf(p.planted_on) : null
  const to = p.ended_on ? yearOf(p.ended_on) : null
  const span = from && to && from !== to ? `${from}–${to}` : (to ?? from ?? '')

  return (
    <Link className="row" to={`/planting/${p.id}`}>
      <span className="row-emoji">{plantEmoji(plantType)}</span>
      <div className="row-body">
        <div className="row-title">{plantName}</div>
        <div className="row-sub">
          {span && `${span} · `}
          {STATUS_LABELS[p.status]}
          {p.author_email && ` · посадил(а): ${p.author_email}`}
          {p.end_note && ` — ${p.end_note}`}
        </div>
      </div>
      <span className={`badge badge--${p.status}`}>{STATUS_LABELS[p.status]}</span>
    </Link>
  )
}
