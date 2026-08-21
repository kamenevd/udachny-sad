import type { Feature } from '../lib/types'
import type { Shape } from '../lib/geometry'
import { shapeBounds } from '../lib/geometry'
import { FEATURE_KINDS } from '../lib/catalog'

/** Палитра плана: спокойные «садовые» цвета, читаемые на солнце. */
const STYLE: Record<
  Feature['kind'],
  { fill: string; stroke: string }
> = {
  lawn: { fill: '#bcd99b', stroke: '#a3c47f' },
  water: { fill: '#a5d2e8', stroke: '#6fa8c9' },
  path: { fill: 'none', stroke: '#ddc9a3' },
  bed: { fill: '#f2d7e2', stroke: '#cf90ae' },
  hedge: { fill: 'none', stroke: '#5a8342' },
  house: { fill: '#e6d8c4', stroke: '#a68c6b' },
  building: { fill: '#dcd6ca', stroke: '#9d968a' },
  tree: { fill: '#8cba6d', stroke: '#5f8747' },
  shrub: { fill: '#aacb87', stroke: '#7fa261' },
}

const SEL_COLOR = '#0b57d0'

interface Props {
  kind: Feature['kind']
  shape: Shape
  label?: string
  selected?: boolean
  /** px на метр — для линий постоянной экранной толщины. */
  scale: number
}

function pointsAttr(pts: [number, number][]): string {
  return pts.map(([x, y]) => `${x},${y}`).join(' ')
}

export function FeatureShape({ kind, shape, label, selected, scale }: Props) {
  const st = STYLE[kind]
  const selStroke = selected
    ? { stroke: SEL_COLOR, strokeWidth: 3 / scale, strokeDasharray: `${8 / scale} ${6 / scale}` }
    : null

  let body: React.ReactNode = null
  let decor: React.ReactNode = null

  switch (shape.t) {
    case 'rect': {
      const rot = shape.a
        ? `rotate(${shape.a} ${shape.x + shape.w / 2} ${shape.y + shape.h / 2})`
        : undefined
      body = (
        <rect
          x={shape.x}
          y={shape.y}
          width={shape.w}
          height={shape.h}
          rx={kind === 'lawn' ? 0.4 : 0.1}
          transform={rot}
          fill={st.fill}
          stroke={st.stroke}
          strokeWidth={0.12}
        />
      )
      if (kind === 'house') {
        decor = (
          <path
            d={`M ${shape.x} ${shape.y} L ${shape.x + shape.w} ${shape.y + shape.h} M ${shape.x + shape.w} ${shape.y} L ${shape.x} ${shape.y + shape.h}`}
            transform={rot}
            stroke={st.stroke}
            strokeWidth={0.06}
            fill="none"
          />
        )
      }
      break
    }
    case 'circle': {
      body = (
        <circle
          cx={shape.cx}
          cy={shape.cy}
          r={shape.r}
          fill={st.fill}
          stroke={st.stroke}
          strokeWidth={0.1}
        />
      )
      if (kind === 'tree') {
        decor = <circle cx={shape.cx} cy={shape.cy} r={0.15} fill="#7d6248" />
      }
      break
    }
    case 'ellipse': {
      body = (
        <ellipse
          cx={shape.cx}
          cy={shape.cy}
          rx={shape.rx}
          ry={shape.ry}
          fill={st.fill}
          stroke={st.stroke}
          strokeWidth={0.1}
          strokeDasharray={kind === 'bed' ? '0.3 0.2' : undefined}
        />
      )
      break
    }
    case 'poly': {
      body = (
        <polygon
          points={pointsAttr(shape.pts)}
          fill={st.fill}
          stroke={st.stroke}
          strokeWidth={0.1}
          strokeLinejoin="round"
          strokeDasharray={kind === 'bed' ? '0.3 0.2' : undefined}
        />
      )
      break
    }
    case 'line': {
      body = (
        <polyline
          points={pointsAttr(shape.pts)}
          fill="none"
          stroke={st.stroke}
          strokeWidth={shape.w}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )
      if (kind === 'hedge') {
        decor = (
          <polyline
            points={pointsAttr(shape.pts)}
            fill="none"
            stroke="#7fa95f"
            strokeWidth={shape.w * 0.45}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${shape.w * 0.6} ${shape.w * 0.5}`}
          />
        )
      }
      if (kind === 'path') {
        decor = (
          <polyline
            points={pointsAttr(shape.pts)}
            fill="none"
            stroke="#c5ad81"
            strokeWidth={0.05}
            strokeDasharray="0.4 0.3"
          />
        )
      }
      break
    }
  }

  const b = shapeBounds(shape)
  const text = label || (kind === 'house' ? FEATURE_KINDS.house.label : '')
  const fontSize = Math.min(0.9, Math.max(0.35, Math.min(b.w, b.h) * 0.22))
  const showText =
    !!text && (kind === 'house' || kind === 'building' || kind === 'bed' || kind === 'lawn' || kind === 'water')

  return (
    <g>
      {body}
      {decor}
      {showText && fontSize * scale >= 9 && (
        <text
          x={b.x + b.w / 2}
          y={b.y + b.h / 2}
          fontSize={fontSize}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#4a4438"
          stroke="#ffffff"
          strokeWidth={fontSize * 0.12}
          paintOrder="stroke"
          fontWeight={600}
          style={{ pointerEvents: 'none' }}
        >
          {text}
        </text>
      )}
      {selStroke && shape.t === 'line' ? (
        <polyline
          points={pointsAttr(shape.pts)}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          {...selStroke}
          strokeWidth={shape.w + 4 / scale}
          strokeDasharray={undefined}
          opacity={0.35}
        />
      ) : selStroke ? (
        <rect
          x={b.x - 0.15}
          y={b.y - 0.15}
          width={b.w + 0.3}
          height={b.h + 0.3}
          fill="none"
          rx={0.2}
          {...selStroke}
        />
      ) : null}
    </g>
  )
}
