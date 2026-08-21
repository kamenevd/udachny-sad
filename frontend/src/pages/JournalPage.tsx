import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fileUrl, pb } from '../lib/pb'
import type { Entry, EntryType } from '../lib/types'
import { ENTRY_MENU, ENTRY_TYPES, plantEmoji } from '../lib/catalog'
import { fmtDateShort, fmtMonthYear, groupBy } from '../lib/dates'
import JournalTabs from '../ui/JournalTabs'

const PER_PAGE = 60

/** Общий журнал: все события сада, свежие сверху, с фильтром по типу. */
export default function JournalPage() {
  const [filter, setFilter] = useState<EntryType | ''>('')
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    setBusy(true)
    ;(async () => {
      try {
        const res = await pb.collection('entries').getList<Entry>(page, PER_PAGE, {
          filter: filter ? pb.filter('etype = {:t}', { t: filter }) : '',
          expand: 'planting.plant',
          sort: '-happened_on,-created',
        })
        if (cancelled) return
        setEntries((prev) => (page === 1 || !prev ? res.items : [...prev, ...res.items]))
        setHasMore(page < res.totalPages)
      } finally {
        if (!cancelled) setBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [filter, page])

  const byMonth = entries ? groupBy(entries, (e) => fmtMonthYear(e.happened_on)) : []

  return (
    <div className="page">
      <div className="top-bar">
        <h1>📖 Журнал</h1>
      </div>

      <JournalTabs />

      <div className="chips">
        <button
          className={`chip ${filter === '' ? 'active' : ''}`}
          onClick={() => {
            setFilter('')
            setPage(1)
          }}
        >
          Все
        </button>
        {ENTRY_MENU.map((t) => (
          <button
            key={t}
            className={`chip ${filter === t ? 'active' : ''}`}
            onClick={() => {
              setFilter(t)
              setPage(1)
            }}
          >
            {ENTRY_TYPES[t].emoji} {ENTRY_TYPES[t].label}
          </button>
        ))}
      </div>

      {entries === null && <div className="spinner" />}

      {entries !== null && entries.length === 0 && (
        <div className="empty">
          <span className="empty-emoji">📖</span>
          <p>
            {filter
              ? `Записей «${ENTRY_TYPES[filter].label}» пока нет.`
              : 'Журнал пуст. Откройте посадку на плане и добавьте первую запись — полив, цветение, обрезку…'}
          </p>
        </div>
      )}

      {byMonth.map(([month, list]) => (
        <div key={month} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="year-head">{month}</div>
          {list.map((e) => {
            const meta = ENTRY_TYPES[e.etype]
            const planting = e.expand?.planting
            const plant = planting?.expand?.plant
            const plantName = plant?.name ?? planting?.plant_name ?? 'Растение'
            const plantType = plant?.ptype ?? planting?.plant_ptype ?? ''
            return (
              <Link
                key={e.id}
                to={`/planting/${e.planting}`}
                className="entry-row"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <span className="entry-emoji">{meta.emoji}</span>
                <div className="entry-body">
                  <div className="entry-head">
                    <span className="entry-type">
                      {plantEmoji(plantType)} {plantName} — {meta.label.toLowerCase()}
                    </span>
                    <span className="entry-date">{fmtDateShort(e.happened_on)}</span>
                  </div>
                  {e.author_email && <p className="muted">Кто: {e.author_email}</p>}
                  {e.note && <p className="entry-note">{e.note}</p>}
                  {e.photos.length > 0 && (
                    <div className="entry-photos">
                      {e.photos.slice(0, 3).map((ph) => (
                        <img key={ph} src={fileUrl(e, ph, '100x100')} alt="" />
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      ))}

      {hasMore && (
        <button className="btn btn--secondary" disabled={busy} onClick={() => setPage((p) => p + 1)}>
          {busy ? 'Загружаем…' : 'Показать ещё'}
        </button>
      )}
    </div>
  )
}
