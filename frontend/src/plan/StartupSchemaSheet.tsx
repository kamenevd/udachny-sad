import { useEffect, useMemo, useRef, useState } from 'react'
import {
  MIN_STARTUP_PHOTOS,
  STARTUP_POINTS,
  canDrawStartup,
  nextStartupPoint,
  startupWalkDone,
  type StartupPoint,
} from '../lib/startupSchema'
import type { StartupShot } from './store'
import { usePlan } from './store'
import Sheet from '../ui/Sheet'

interface Props {
  onClose: () => void
}

/**
 * Стартовая схема с фото: карта с точками съёмки, человек ходит и снимает.
 * После последней точки план рисуется сам — без вопросов про фото.
 */
export default function StartupSchemaSheet({ onClose }: Props) {
  const plot = usePlan((s) => s.plot)
  const [shots, setShots] = useState<Record<string, File>>({})
  const [skipped, setSkipped] = useState<string[]>([])
  const [currentId, setCurrentId] = useState<string>(STARTUP_POINTS[0].id)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const shotIds = useMemo(() => Object.keys(shots), [shots])
  const current = STARTUP_POINTS.find((p) => p.id === currentId) ?? STARTUP_POINTS[0]
  const walkDone = startupWalkDone(shotIds, skipped)
  const enough = canDrawStartup(shotIds.length)
  const currentUrl = useMemo(
    () => (shots[currentId] ? URL.createObjectURL(shots[currentId]) : null),
    [shots, currentId],
  )

  useEffect(() => {
    return () => {
      if (currentUrl) URL.revokeObjectURL(currentUrl)
    }
  }, [currentUrl])

  function draw(nextShots: Record<string, File>) {
    const list: StartupShot[] = STARTUP_POINTS.filter((p) => nextShots[p.id]).map((p) => ({
      point: p,
      file: nextShots[p.id],
    }))
    void usePlan.getState().runStartupSchema(list)
    onClose()
  }

  function afterChange(nextShots: Record<string, File>, nextSkipped: string[]) {
    const ids = Object.keys(nextShots)
    if (startupWalkDone(ids, nextSkipped) && canDrawStartup(ids.length)) {
      draw(nextShots)
      return
    }
    const next = nextStartupPoint(ids, nextSkipped)
    if (next) setCurrentId(next.id)
  }

  function addPhoto(file: File | null | undefined) {
    if (!file) return
    const nextShots = { ...shots, [currentId]: file }
    const nextSkipped = skipped.filter((id) => id !== currentId)
    setShots(nextShots)
    setSkipped(nextSkipped)
    afterChange(nextShots, nextSkipped)
  }

  function skipCurrent() {
    if (shots[currentId]) return
    const nextSkipped = skipped.includes(currentId) ? skipped : [...skipped, currentId]
    setSkipped(nextSkipped)
    afterChange(shots, nextSkipped)
  }

  function pickPoint(p: StartupPoint) {
    setCurrentId(p.id)
    if (skipped.includes(p.id)) setSkipped(skipped.filter((id) => id !== p.id))
  }

  return (
    <Sheet title="Стартовая схема с фото" onClose={onClose}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p>Пройдите по участку и снимите его с отмеченных точек.</p>
        <p className="muted">После последней точки план нарисуется сам. Потом всё можно поправить.</p>
      </div>

      <WalkMap
        widthM={plot?.width ?? 20}
        heightM={plot?.height ?? 15}
        shotIds={shotIds}
        skipped={skipped}
        currentId={currentId}
        onPick={pickPoint}
      />

      <p className="muted" style={{ textAlign: 'center', margin: 0 }}>
        Снято: {shotIds.length}
        {shotIds.length < MIN_STARTUP_PHOTOS && ` · для плана нужно хотя бы ${MIN_STARTUP_PHOTOS}`}
      </p>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="startup-point-badge">{current.n}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3>{current.label}</h3>
            <p className="muted">{current.hint}</p>
          </div>
          {currentUrl && (
            <img
              src={currentUrl}
              alt={`Снимок: ${current.label}`}
              style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--line)' }}
            />
          )}
        </div>

        <button className="btn btn--block" onClick={() => cameraRef.current?.click()}>
          📷 {shots[current.id] ? 'Переснять' : 'Снять'}
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn--secondary" style={{ flex: 1 }} onClick={() => galleryRef.current?.click()}>
            🖼️ Из галереи
          </button>
          {!shots[current.id] && (
            <button className="btn btn--ghost" style={{ flex: 1 }} onClick={skipCurrent}>
              Не добраться — пропустить
            </button>
          )}
        </div>
      </div>

      {walkDone && !enough && (
        <p className="muted" style={{ textAlign: 'center' }}>
          Пропущено слишком много. Коснитесь точки на карте и снимите её —
          нужно хотя бы {MIN_STARTUP_PHOTOS} фото.
        </p>
      )}

      <button className="btn btn--block" disabled={!enough} onClick={() => draw(shots)}>
        {enough ? `✨ Готово, рисуй (${shotIds.length} фото)` : 'Готово, рисуй'}
      </button>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          addPhoto(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          addPhoto(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </Sheet>
  )
}

function WalkMap({
  widthM,
  heightM,
  shotIds,
  skipped,
  currentId,
  onPick,
}: {
  widthM: number
  heightM: number
  shotIds: string[]
  skipped: string[]
  currentId: string
  onPick: (p: StartupPoint) => void
}) {
  const W = 100
  const H = W * Math.min(Math.max(heightM / widthM, 0.55), 1.4)

  return (
    <svg
      className="startup-map"
      viewBox={`-6 -6 ${W + 12} ${H + 12}`}
      role="group"
      aria-label="Карта точек съёмки"
    >
      <rect x={0} y={0} width={W} height={H} rx={3} className="startup-map-plot" />
      {/* Улица и калитка — снизу. */}
      <text x={W / 2} y={H + 5} textAnchor="middle" className="startup-map-street">
        улица
      </text>
      {STARTUP_POINTS.map((p) => {
        const cx = p.x * W
        const cy = p.y * H
        const isShot = shotIds.includes(p.id)
        const isSkipped = skipped.includes(p.id)
        const isCurrent = p.id === currentId
        const cls = isCurrent
          ? 'startup-map-point startup-map-point--current'
          : isShot
            ? 'startup-map-point startup-map-point--done'
            : isSkipped
              ? 'startup-map-point startup-map-point--skipped'
              : p.required
                ? 'startup-map-point'
                : 'startup-map-point startup-map-point--optional'
        return (
          <g key={p.id} className={cls} onClick={() => onPick(p)}>
            {/* Куда смотреть — короткий луч от точки. */}
            <line x1={cx} y1={cy} x2={cx + p.dx * 8} y2={cy + p.dy * 8} className="startup-map-ray" />
            <circle cx={cx} cy={cy} r={isCurrent ? 6.5 : 5.5} className="startup-map-dot" />
            <text x={cx} y={cy + 2.2} textAnchor="middle" className="startup-map-num">
              {isShot ? '✓' : isSkipped ? '–' : p.n}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
