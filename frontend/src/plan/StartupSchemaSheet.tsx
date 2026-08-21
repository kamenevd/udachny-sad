import { useEffect, useMemo, useRef, useState } from 'react'
import { FEATURE_KINDS } from '../lib/catalog'
import {
  hasStartupSignals,
  type StartupAreaHint,
  type StartupFocus,
  type StartupHouseHint,
  type StartupPhotoPrompt,
  type StartupPlotOutline,
  type StartupSizeHint,
} from '../lib/startupSchema'
import type { StartupSchemaResult } from './store'
import { usePlan } from './store'
import Sheet from '../ui/Sheet'

interface Props {
  onClose: () => void
}

const MAX_PHOTOS = 8

const HOUSE_OPTIONS: Array<{ value: StartupHouseHint; label: string }> = [
  { value: 'none', label: 'Дом не видно' },
  { value: 'left', label: 'Слева' },
  { value: 'center', label: 'По центру' },
  { value: 'right', label: 'Справа' },
  { value: 'far', label: 'Далеко, на фоне' },
]

const FOCUS_OPTIONS: Array<{ value: StartupFocus; label: string }> = [
  { value: 'none', label: 'Пока ничего' },
  { value: 'path', label: 'Дорожка' },
  { value: 'bed', label: 'Клумба' },
  { value: 'trees', label: 'Деревья' },
]

const AREA_OPTIONS: Array<{ value: StartupAreaHint; label: string }> = [
  { value: 'unknown', label: 'Не знаю' },
  { value: 'center', label: 'По центру' },
  { value: 'top', label: 'Сверху' },
  { value: 'bottom', label: 'Снизу' },
  { value: 'left', label: 'Слева' },
  { value: 'right', label: 'Справа' },
  { value: 'top-left', label: 'Левый верх' },
  { value: 'top-right', label: 'Правый верх' },
  { value: 'bottom-left', label: 'Левый низ' },
  { value: 'bottom-right', label: 'Правый низ' },
]

const SIZE_OPTIONS: Array<{ value: StartupSizeHint; label: string }> = [
  { value: 'small', label: 'Небольшой' },
  { value: 'medium', label: 'Средний' },
  { value: 'large', label: 'Крупный' },
]

const OUTLINE_OPTIONS: Array<{ value: StartupPlotOutline; label: string }> = [
  { value: 'rect', label: 'Прямоугольный или почти ровный' },
  { value: 'narrow', label: 'Длинный и узкий' },
  { value: 'l-shape', label: 'Г-образный' },
  { value: 'free', label: 'Сложной формы' },
]

function defaultPrompt(): StartupPhotoPrompt {
  return {
    house: 'none',
    focus: 'none',
    area: 'unknown',
    size: 'medium',
  }
}

function kindSummary(result: StartupSchemaResult | null): string {
  if (!result) return ''
  const order: Array<keyof StartupSchemaResult['byKind']> = ['house', 'path', 'bed', 'tree']
  return order
    .map((kind) => {
      const count = result.byKind[kind]
      if (!count) return ''
      return `${FEATURE_KINDS[kind].label}: ${count}`
    })
    .filter(Boolean)
    .join(' · ')
}

export default function StartupSchemaSheet({ onClose }: Props) {
  const [items, setItems] = useState<Array<{ file: File; prompt: StartupPhotoPrompt }>>([])
  const [outline, setOutline] = useState<StartupPlotOutline>('rect')
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<StartupSchemaResult | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const photos = useMemo(() => items.map((it) => it.file), [items])
  const prompts = useMemo(() => items.map((it) => it.prompt), [items])
  const urls = useMemo(() => photos.map((f) => URL.createObjectURL(f)), [photos])

  useEffect(() => {
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [urls])

  function addPhotos(list: FileList | null) {
    if (!list?.length) return
    setItems((prev) => {
      const rest = MAX_PHOTOS - prev.length
      if (rest <= 0) return prev
      const added = Array.from(list)
        .slice(0, rest)
        .map((file) => ({ file, prompt: defaultPrompt() }))
      return [...prev, ...added]
    })
    setResult(null)
  }

  function updatePrompt(index: number, patch: Partial<StartupPhotoPrompt>) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item
        return { ...item, prompt: { ...item.prompt, ...patch } }
      }),
    )
    setResult(null)
  }

  function removePhoto(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
    setResult(null)
  }

  const canBuild = photos.length > 0 && hasStartupSignals(prompts) && !saving

  async function build() {
    if (!canBuild) return
    setSaving(true)
    try {
      const out = await usePlan.getState().createStartupSchema(outline, prompts)
      setResult(out)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet title="Стартовая схема с фото" onClose={onClose}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p>
          Это первая настройка нового участка: добавьте несколько фото, ответьте коротко, и мы набросаем
          черновой план.
        </p>
        <p className="muted">Потом сможете спокойно поправить всё на плане свободными формами.</p>
      </div>

      <div className="photo-input">
        {photos.map((f, i) => (
          <div key={`${f.name}-${i}`} className="photo-preview">
            <img src={urls[i]} alt={`Фото ${i + 1}`} />
            <button type="button" aria-label="Убрать фото" onClick={() => removePhoto(i)}>
              ✕
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" style={{ flex: 1 }} onClick={() => cameraRef.current?.click()}>
          📷 Снять
        </button>
        <button className="btn btn--secondary" style={{ flex: 1 }} onClick={() => galleryRef.current?.click()}>
          🖼️ Из галереи
        </button>
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          addPhotos(e.target.files)
          e.target.value = ''
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          addPhotos(e.target.files)
          e.target.value = ''
        }}
      />

      <label className="field">
        <span>Какой примерно формы участок?</span>
        <select className="input" value={outline} onChange={(e) => setOutline(e.target.value as StartupPlotOutline)}>
          {OUTLINE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {photos.length === 0 && (
        <p className="muted" style={{ textAlign: 'center' }}>
          Добавьте 3-8 фото, чтобы схема получилась точнее.
        </p>
      )}

      {photos.map((_, i) => {
        const prompt = prompts[i] ?? defaultPrompt()
        const focusPicked = prompt.focus !== 'none'
        return (
          <div key={`prompt-${i}`} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img
                src={urls[i]}
                alt={`Фото ${i + 1}`}
                style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--line)' }}
              />
              <div>
                <h3>Фото {i + 1}</h3>
                <p className="muted">Короткие ответы помогут точнее разложить объекты на плане.</p>
              </div>
            </div>

            <label className="field">
              <span>Где дом на этом фото?</span>
              <select
                className="input"
                value={prompt.house}
                onChange={(e) => updatePrompt(i, { house: e.target.value as StartupHouseHint })}
              >
                {HOUSE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Что здесь лучше всего видно?</span>
              <select
                className="input"
                value={prompt.focus}
                onChange={(e) => updatePrompt(i, { focus: e.target.value as StartupFocus })}
              >
                {FOCUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Где это примерно на участке?</span>
              <select
                className="input"
                disabled={!focusPicked}
                value={prompt.area}
                onChange={(e) => updatePrompt(i, { area: e.target.value as StartupAreaHint })}
              >
                {AREA_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Насколько объект крупный?</span>
              <select
                className="input"
                disabled={!focusPicked}
                value={prompt.size}
                onChange={(e) => updatePrompt(i, { size: e.target.value as StartupSizeHint })}
              >
                {SIZE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )
      })}

      {!hasStartupSignals(prompts) && photos.length > 0 && (
        <p className="muted" style={{ textAlign: 'center' }}>
          Подскажите хотя бы одно место дома или один объект на фото.
        </p>
      )}

      {result && (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p>
            Добавили на план: <b>{result.created}</b>
            {result.failed > 0 && (
              <>
                {' '}
                из <b>{result.requested}</b>
              </>
            )}
            .
          </p>
          {kindSummary(result) && <p className="muted">{kindSummary(result)}</p>}
          <button className="btn btn--secondary btn--block" onClick={onClose}>
            ✏️ Перейти к правке схемы
          </button>
        </div>
      )}

      <button className="btn btn--block" disabled={!canBuild} onClick={build}>
        {saving ? 'Набрасываем…' : '🧭 Набросать схему'}
      </button>
    </Sheet>
  )
}
