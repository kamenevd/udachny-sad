import { useEffect, useRef, useState } from 'react'
import type { Pt, Shape } from '../lib/geometry'
import {
  dist,
  dragHandle,
  dragRotate,
  hitShape,
  keepInside,
  moveShape,
  rectRotateHandle,
  shapeHandles,
  snap,
} from '../lib/geometry'
import { FEATURE_KINDS, plantEmoji } from '../lib/catalog'
import type { Feature } from '../lib/types'
import { usePlan } from './store'
import { FeatureShape } from './shapes'

interface View {
  tx: number
  ty: number
  s: number // px на метр
}

type Gesture =
  | { g: 'pan'; sx: number; sy: number; otx: number; oty: number; moved: boolean }
  | { g: 'pinch'; d0: number; s0: number; wx: number; wy: number }
  | { g: 'shape'; start: Pt; orig: Shape; moved: boolean }
  | { g: 'handle'; idx: number }
  | { g: 'rotate' }

const MIN_S = 2
const MAX_S = 160
const TAP_PX = 9

/** Порядок отрисовки/попадания: сначала нижние слои. */
function renderOrder(features: Feature[]): Feature[] {
  return [...features].sort((a, b) => FEATURE_KINDS[a.kind].order - FEATURE_KINDS[b.kind].order)
}

export default function PlanCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const { plot, features, plantings, sel, mode, select, setDraft, placeAt } = usePlan()
  const [view, setView] = useState<View>({ tx: 0, ty: 0, s: 24 })

  const viewRef = useRef(view)
  viewRef.current = view
  const stateRef = useRef({ features, plantings, mode, plot })
  stateRef.current = { features, plantings, mode, plot }

  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<Gesture | null>(null)

  // Вписать участок в экран при загрузке.
  useEffect(() => {
    if (!plot || !wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    const s = Math.min(
      MAX_S,
      Math.max(MIN_S, Math.min((rect.width - 48) / plot.width, (rect.height - 200) / plot.height)),
    )
    setView({
      tx: (rect.width - plot.width * s) / 2,
      ty: (rect.height - plot.height * s) / 2,
      s,
    })
  }, [plot?.id, plot])

  function toLocal(e: { clientX: number; clientY: number }): { x: number; y: number } {
    const rect = wrapRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function toWorld(local: { x: number; y: number }, v = viewRef.current): Pt {
    return { x: (local.x - v.tx) / v.s, y: (local.y - v.ty) / v.s }
  }

  function hitTest(p: Pt): { type: 'feature' | 'planting'; id: string } | null {
    const v = viewRef.current
    const { features: fs, plantings: pls } = stateRef.current
    const plantingR = Math.max(0.5, 24 / v.s)
    // Посадки — верхний слой.
    for (let i = pls.length - 1; i >= 0; i--) {
      const pl = pls[i]
      if (pl.status !== 'growing') continue
      if (dist(p, { x: pl.x, y: pl.y }) <= plantingR) return { type: 'planting', id: pl.id }
    }
    const tol = 8 / v.s
    const ordered = renderOrder(fs)
    for (let i = ordered.length - 1; i >= 0; i--) {
      if (hitShape(ordered[i].shape, p, tol)) return { type: 'feature', id: ordered[i].id }
    }
    return null
  }

  function startPinch() {
    const pts = [...pointers.current.values()]
    if (pts.length < 2) return
    const v = viewRef.current
    const d0 = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1
    const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
    const w = toWorld(mid, v)
    gesture.current = { g: 'pinch', d0, s0: v.s, wx: w.x, wy: w.y }
  }

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    const local = toLocal(e)
    pointers.current.set(e.pointerId, local)

    if (pointers.current.size === 2) {
      startPinch()
      return
    }
    if (pointers.current.size !== 1) return

    const v = viewRef.current
    const { mode: m } = stateRef.current
    const world = toWorld(local)
    const target = e.target as SVGElement
    const handleIdx = target.dataset?.handle

    if (m.m === 'edit') {
      if (target.dataset?.rotate !== undefined) {
        gesture.current = { g: 'rotate' }
        return
      }
      if (handleIdx !== undefined) {
        gesture.current = { g: 'handle', idx: Number(handleIdx) }
        return
      }
      if (hitShape(m.draft, world, 12 / v.s)) {
        gesture.current = { g: 'shape', start: world, orig: m.draft, moved: false }
        return
      }
    }
    gesture.current = { g: 'pan', sx: local.x, sy: local.y, otx: v.tx, oty: v.ty, moved: false }
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!pointers.current.has(e.pointerId)) return
    const local = toLocal(e)
    pointers.current.set(e.pointerId, local)
    const g = gesture.current
    if (!g) return

    if (g.g === 'pinch') {
      const pts = [...pointers.current.values()]
      if (pts.length < 2) return
      const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
      const s = Math.min(MAX_S, Math.max(MIN_S, (g.s0 * d) / g.d0))
      setView({ s, tx: mid.x - g.wx * s, ty: mid.y - g.wy * s })
      return
    }

    if (g.g === 'pan') {
      const dx = local.x - g.sx
      const dy = local.y - g.sy
      if (Math.hypot(dx, dy) > TAP_PX) g.moved = true
      setView((v) => ({ ...v, tx: g.otx + dx, ty: g.oty + dy }))
      return
    }

    const { mode: m, plot: pl } = stateRef.current
    if (m.m !== 'edit' || !pl) return
    const world = toWorld(local)

    if (g.g === 'shape') {
      const dx = snap(world.x - g.start.x)
      const dy = snap(world.y - g.start.y)
      if (dx !== 0 || dy !== 0) g.moved = true
      setDraft(keepInside(moveShape(g.orig, dx, dy), pl.width, pl.height))
      return
    }

    if (g.g === 'handle') {
      setDraft(dragHandle(m.draft, g.idx, world))
      return
    }

    if (g.g === 'rotate' && m.draft.t === 'rect') {
      setDraft(dragRotate(m.draft, world))
    }
  }

  function onPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    const had = pointers.current.delete(e.pointerId)
    if (!had) return
    const g = gesture.current

    if (pointers.current.size === 1 && g?.g === 'pinch') {
      // Один палец остался — продолжаем как панорамирование.
      const rest = [...pointers.current.values()][0]
      const v = viewRef.current
      gesture.current = { g: 'pan', sx: rest.x, sy: rest.y, otx: v.tx, oty: v.ty, moved: true }
      return
    }
    if (pointers.current.size > 0) return

    gesture.current = null
    if (g?.g === 'pan' && !g.moved) {
      const world = toWorld(toLocal(e))
      const { mode: m } = stateRef.current
      if (
        m.m === 'add-feature' ||
        m.m === 'add-planting' ||
        m.m === 'quick-plant' ||
        m.m === 'move-planting'
      ) {
        placeAt(world)
        return
      }
      if (m.m === 'edit') return
      select(hitTest(world))
    }
  }

  function onWheel(e: React.WheelEvent<SVGSVGElement>) {
    const local = toLocal(e)
    const v = viewRef.current
    const w = toWorld(local, v)
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
    const s = Math.min(MAX_S, Math.max(MIN_S, v.s * factor))
    setView({ s, tx: local.x - w.x * s, ty: local.y - w.y * s })
  }

  function zoomBy(factor: number) {
    const rect = wrapRef.current!.getBoundingClientRect()
    const mid = { x: rect.width / 2, y: rect.height / 2 }
    const v = viewRef.current
    const w = toWorld(mid, v)
    const s = Math.min(MAX_S, Math.max(MIN_S, v.s * factor))
    setView({ s, tx: mid.x - w.x * s, ty: mid.y - w.y * s })
  }

  if (!plot) return <div ref={wrapRef} className="plan-wrap" />

  const editingId = mode.m === 'edit' ? mode.featureId : null
  const draft = mode.m === 'edit' ? mode.draft : null
  const ordered = renderOrder(features)
  const grid = view.s >= 7 ? 1 : 5

  return (
    <div ref={wrapRef} className="plan-wrap">
      <svg
        className="plan-svg"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <defs>
          <pattern id="grid" width={grid} height={grid} patternUnits="userSpaceOnUse">
            <path
              d={`M ${grid} 0 L 0 0 0 ${grid}`}
              fill="none"
              stroke="#5c6a5e"
              strokeOpacity={0.16}
              strokeWidth={1 / view.s}
            />
          </pattern>
        </defs>
        <g transform={`translate(${view.tx},${view.ty}) scale(${view.s})`}>
          {/* Земля участка */}
          <rect
            x={0}
            y={0}
            width={plot.width}
            height={plot.height}
            fill="#f2efdf"
            stroke="#8a8571"
            strokeWidth={2.5 / view.s}
          />
          <rect x={0} y={0} width={plot.width} height={plot.height} fill="url(#grid)" />

          {ordered.map((f) => {
            const isEditing = f.id === editingId
            return (
              <FeatureShape
                key={f.id}
                kind={f.kind}
                shape={isEditing && draft ? draft : f.shape}
                label={f.label}
                selected={sel?.type === 'feature' && sel.id === f.id}
                scale={view.s}
              />
            )
          })}

          {/* Посадки */}
          {plantings
            .filter((p) => p.status === 'growing')
            .map((p) => {
              const r = Math.max(0.42, 15 / view.s)
              const isSel = sel?.type === 'planting' && sel.id === p.id
              const name = p.expand?.plant?.name ?? ''
              return (
                <g key={p.id}>
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={r}
                    fill="#ffffff"
                    stroke={isSel ? '#0b57d0' : '#2e6b34'}
                    strokeWidth={(isSel ? 3 : 2) / view.s}
                  />
                  <text
                    x={p.x}
                    y={p.y}
                    fontSize={r * 1.15}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ pointerEvents: 'none' }}
                  >
                    {plantEmoji(p.expand?.plant?.ptype ?? '')}
                  </text>
                  {view.s >= 22 && name && (
                    <text
                      x={p.x}
                      y={p.y + r + 14 / view.s}
                      fontSize={12 / view.s}
                      textAnchor="middle"
                      fill="#1f2a20"
                      stroke="#ffffff"
                      strokeWidth={3 / view.s}
                      paintOrder="stroke"
                      fontWeight={600}
                      style={{ pointerEvents: 'none' }}
                    >
                      {name}
                    </text>
                  )}
                </g>
              )
            })}

          {/* Ручки редактирования */}
          {draft &&
            shapeHandles(draft).map((h, i) => (
              <g key={i}>
                <circle
                  cx={h.x}
                  cy={h.y}
                  r={26 / view.s}
                  fill="transparent"
                  data-handle={i}
                />
                <circle
                  cx={h.x}
                  cy={h.y}
                  r={11 / view.s}
                  fill="#ffffff"
                  stroke="#0b57d0"
                  strokeWidth={3 / view.s}
                  data-handle={i}
                  style={{ pointerEvents: 'none' }}
                />
              </g>
            ))}

          {/* Ручка поворота (только прямоугольники) */}
          {draft &&
            draft.t === 'rect' &&
            (() => {
              const rh = rectRotateHandle(draft, 44 / view.s)
              const top = rectRotateHandle(draft, 0)
              return (
                <g>
                  <line
                    x1={top.x}
                    y1={top.y}
                    x2={rh.x}
                    y2={rh.y}
                    stroke="#0b57d0"
                    strokeWidth={2 / view.s}
                    strokeDasharray={`${4 / view.s} ${4 / view.s}`}
                  />
                  <circle cx={rh.x} cy={rh.y} r={26 / view.s} fill="transparent" data-rotate="" />
                  <circle
                    cx={rh.x}
                    cy={rh.y}
                    r={13 / view.s}
                    fill="#0b57d0"
                    stroke="#ffffff"
                    strokeWidth={2.5 / view.s}
                    data-rotate=""
                    style={{ pointerEvents: 'none' }}
                  />
                  <text
                    x={rh.x}
                    y={rh.y}
                    fontSize={16 / view.s}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#ffffff"
                    style={{ pointerEvents: 'none' }}
                  >
                    ⟳
                  </text>
                </g>
              )
            })()}
        </g>
      </svg>

      <div className="zoom-controls">
        <button aria-label="Приблизить" onClick={() => zoomBy(1.4)}>
          +
        </button>
        <button aria-label="Отдалить" onClick={() => zoomBy(1 / 1.4)}>
          −
        </button>
      </div>
    </div>
  )
}
