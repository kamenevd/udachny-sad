import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fileUrl, pb } from '../lib/pb'
import type { Entry } from '../lib/types'
import { ENTRY_TYPES, plantEmoji } from '../lib/catalog'
import { fmtDate, fmtMonthYear, groupBy, plural } from '../lib/dates'
import JournalTabs from '../ui/JournalTabs'

const PER_PAGE = 40

interface Photo {
  entry: Entry
  file: string
  /** Сквозной номер в ленте — по нему листается просмотр. */
  i: number
}

/** Фотолента: все снимки из журнала, по месяцам, свежие сверху. */
export default function PhotosPage() {
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [openAt, setOpenAt] = useState(-1)

  useEffect(() => {
    let cancelled = false
    setBusy(true)
    ;(async () => {
      try {
        const res = await pb.collection('entries').getList<Entry>(page, PER_PAGE, {
          filter: 'photos:length > 0',
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
  }, [page])

  const photos: Photo[] = useMemo(
    () =>
      (entries ?? [])
        .flatMap((e) => e.photos.map((file) => ({ entry: e, file })))
        .map((p, i) => ({ ...p, i })),
    [entries],
  )
  const byMonth = groupBy(photos, (p) => fmtMonthYear(p.entry.happened_on))

  return (
    <div className="page">
      <div className="top-bar">
        <h1>📖 Журнал</h1>
      </div>

      <JournalTabs />

      {entries === null && <div className="spinner" />}

      {entries !== null && photos.length === 0 && (
        <div className="empty">
          <span className="empty-emoji">🖼️</span>
          <p>
            Пока ни одного снимка.
            <br />
            Добавляйте фото к записям журнала — они соберутся здесь, месяц за месяцем, и будет
            видно, как рос сад.
          </p>
        </div>
      )}

      {byMonth.map(([month, list]) => (
        <section key={month} className="photo-month">
          <div className="month-head">
            {month}
            <span className="month-count">
              {list.length} {plural(list.length, ['снимок', 'снимка', 'снимков'])}
            </span>
          </div>
          <div className="photo-grid">
            {list.map((p) => (
              <button
                key={`${p.entry.id}/${p.file}`}
                className="photo-cell"
                aria-label="Открыть снимок"
                onClick={() => setOpenAt(p.i)}
              >
                <img src={fileUrl(p.entry, p.file, '400x400')} loading="lazy" alt="" />
              </button>
            ))}
          </div>
        </section>
      ))}

      {hasMore && (
        <button className="btn btn--secondary" disabled={busy} onClick={() => setPage((p) => p + 1)}>
          {busy ? 'Загружаем…' : 'Показать ещё'}
        </button>
      )}

      {openAt >= 0 && photos[openAt] && (
        <PhotoViewer
          photos={photos}
          index={openAt}
          onIndexChange={setOpenAt}
          onClose={() => setOpenAt(-1)}
        />
      )}
    </div>
  )
}

/** Полноэкранный просмотр: листается свайпом и стрелками, подпись ведёт к записи. */
function PhotoViewer({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: Photo[]
  index: number
  onIndexChange: (i: number) => void
  onClose: () => void
}) {
  const nav = useNavigate()
  const [dx, setDx] = useState(0)
  const touch = useRef<{ x: number; y: number } | null>(null)

  const p = photos[index]
  const entry = p.entry
  const plant = entry.expand?.planting?.expand?.plant
  const meta = ENTRY_TYPES[entry.etype]
  const hasPrev = index > 0
  const hasNext = index < photos.length - 1

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1)
      if (e.key === 'ArrowRight' && index < photos.length - 1) onIndexChange(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, photos.length, onIndexChange, onClose])

  // Соседние снимки подгружаем заранее, чтобы листалось без пауз.
  useEffect(() => {
    for (const n of [index - 1, index + 1]) {
      const ph = photos[n]
      if (ph) new Image().src = fileUrl(ph.entry, ph.file, '800x0')
    }
  }, [index, photos])

  return (
    <div className="viewer" role="dialog" aria-modal="true">
      <div className="viewer-top">
        <span className="viewer-counter">
          {index + 1} из {photos.length}
        </span>
        <button className="icon-btn viewer-close" aria-label="Закрыть" onClick={onClose}>
          ✕
        </button>
      </div>

      <div
        className="viewer-body"
        onTouchStart={(e) => {
          touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
        }}
        onTouchMove={(e) => {
          if (!touch.current) return
          setDx(e.touches[0].clientX - touch.current.x)
        }}
        onTouchEnd={() => {
          if (dx < -60 && hasNext) onIndexChange(index + 1)
          else if (dx > 60 && hasPrev) onIndexChange(index - 1)
          touch.current = null
          setDx(0)
        }}
      >
        <img
          key={`${entry.id}/${p.file}`}
          src={fileUrl(entry, p.file, '800x0')}
          alt=""
          style={dx !== 0 ? { transform: `translateX(${dx}px)`, transition: 'none' } : undefined}
        />
        {hasPrev && (
          <button
            className="viewer-arrow viewer-arrow--prev"
            aria-label="Предыдущий снимок"
            onClick={() => onIndexChange(index - 1)}
          >
            ‹
          </button>
        )}
        {hasNext && (
          <button
            className="viewer-arrow viewer-arrow--next"
            aria-label="Следующий снимок"
            onClick={() => onIndexChange(index + 1)}
          >
            ›
          </button>
        )}
      </div>

      <button className="viewer-caption" onClick={() => nav(`/planting/${entry.planting}`)}>
        <span className="viewer-plant">
          {plantEmoji(plant?.ptype ?? '')} {plant?.name ?? 'Растение'} —{' '}
          {meta.label.toLowerCase()}
        </span>
        <span className="viewer-sub">{fmtDate(entry.happened_on)} · открыть запись ›</span>
      </button>
    </div>
  )
}
