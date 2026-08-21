import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fileUrl, pb, pbError } from '../lib/pb'
import type { Entry, Planting } from '../lib/types'
import { ENTRY_TYPES, plantEmoji } from '../lib/catalog'
import { fmtDate, fmtMonthYear, groupBy, plural, todayISO } from '../lib/dates'
import JournalTabs from '../ui/JournalTabs'
import Sheet from '../ui/Sheet'
import { toast } from '../ui/toast'

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
  const [reloadKey, setReloadKey] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [openAt, setOpenAt] = useState(-1)
  const [quickPhoto, setQuickPhoto] = useState<File | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

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
  }, [page, reloadKey])

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
        <button
          className="icon-btn"
          aria-label="Сфотографировать и добавить в журнал"
          onClick={() => cameraRef.current?.click()}
        >
          📷
        </button>
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

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) setQuickPhoto(f)
          e.target.value = ''
        }}
      />

      {openAt >= 0 && photos[openAt] && (
        <PhotoViewer
          photos={photos}
          index={openAt}
          onIndexChange={setOpenAt}
          onClose={() => setOpenAt(-1)}
        />
      )}

      {quickPhoto && (
        <PhotoOneTapSheet
          photo={quickPhoto}
          onClose={() => setQuickPhoto(null)}
          onSaved={() => {
            setQuickPhoto(null)
            setEntries(null)
            setPage(1)
            setReloadKey((n) => n + 1)
          }}
        />
      )}
    </div>
  )
}

function PhotoOneTapSheet({
  photo,
  onClose,
  onSaved,
}: {
  photo: File
  onClose: () => void
  onSaved: () => void
}) {
  const [url, setUrl] = useState('')
  const [plantings, setPlantings] = useState<Planting[] | null>(null)
  const [q, setQ] = useState('')
  const [picked, setPicked] = useState<Planting | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const u = URL.createObjectURL(photo)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [photo])

  useEffect(() => {
    pb.collection('plantings')
      .getFullList<Planting>({ expand: 'plant,plot', sort: '-created' })
      .then(setPlantings)
      .catch((e) => {
        toast(pbError(e))
        setPlantings([])
      })
  }, [])

  const filtered = (plantings ?? []).filter((p) => {
    if (!q.trim()) return true
    const plant = p.expand?.plant
    const name = (plant?.name ?? p.plant_name ?? '').toLowerCase()
    const cultivar = (plant?.cultivar ?? '').toLowerCase()
    const plotName = (p.expand?.plot?.name ?? '').toLowerCase()
    return (name + ' ' + cultivar + ' ' + plotName).includes(q.trim().toLowerCase())
  })

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!picked) return
    setBusy(true)
    try {
      const data = new FormData()
      data.set('planting', picked.id)
      data.set('etype', 'note')
      data.set('happened_on', todayISO())
      data.set('note', 'Фото одним касанием.')
      data.set('author_email', pb.authStore.record?.email ?? '')
      data.append('photos', photo)
      try {
        await pb.collection('entries').create(data)
      } catch (e) {
        if ((e as { status?: number })?.status !== 400) throw e
        data.delete('author_email')
        await pb.collection('entries').create(data)
      }
      toast('Снимок уже в журнале 📖')
      onSaved()
    } catch (err) {
      toast(pbError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title="Фото одним касанием" onClose={onClose}>
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="quick-photo">
          <img src={url} alt="Новый снимок" />
        </div>

        <label className="field">
          <span>К какому растению добавить?</span>
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по названию и участку…"
          />
        </label>

        {plantings === null && <div className="spinner" />}

        {plantings !== null && filtered.length === 0 && (
          <p className="muted" style={{ textAlign: 'center' }}>
            Нечего выбрать. Сначала посадите растение на плане.
          </p>
        )}

        {filtered.length > 0 && (
          <div className="list" style={{ maxHeight: '34dvh', overflowY: 'auto' }}>
            {filtered.map((p) => {
              const plant = p.expand?.plant
              const plantName = plant?.name ?? p.plant_name ?? 'Растение'
              const plantType = plant?.ptype ?? p.plant_ptype ?? ''
              const subtitle = [p.expand?.plot?.name, p.status === 'growing' ? 'растёт' : 'из истории']
                .filter(Boolean)
                .join(' · ')
              return (
                <button
                  type="button"
                  key={p.id}
                  className="row"
                  style={picked?.id === p.id ? { borderColor: 'var(--green)', background: 'var(--green-soft)' } : undefined}
                  onClick={() => setPicked(p)}
                >
                  <span className="row-emoji">{plantEmoji(plantType)}</span>
                  <div className="row-body">
                    <div className="row-title">{plantName}</div>
                    <div className="row-sub">{subtitle}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <button className="btn btn--block" disabled={busy || !picked}>
          {busy ? 'Сохраняем…' : 'Добавить фото в журнал'}
        </button>
      </form>
    </Sheet>
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
  const planting = entry.expand?.planting
  const plant = planting?.expand?.plant
  const plantName = plant?.name ?? planting?.plant_name ?? 'Растение'
  const plantType = plant?.ptype ?? planting?.plant_ptype ?? ''
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
          {plantEmoji(plantType)} {plantName} — {meta.label.toLowerCase()}
        </span>
        <span className="viewer-sub">
          {fmtDate(entry.happened_on)}
          {entry.author_email ? ` · кто: ${entry.author_email}` : ''}
          {' · открыть запись ›'}
        </span>
      </button>
    </div>
  )
}
