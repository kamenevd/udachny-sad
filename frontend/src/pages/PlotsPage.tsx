import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pb, pbError, setLastPlot } from '../lib/pb'
import type { Plot } from '../lib/types'
import Sheet from '../ui/Sheet'
import { toast } from '../ui/toast'

export default function PlotsPage() {
  const nav = useNavigate()
  const [plots, setPlots] = useState<Plot[] | null>(null)
  const [form, setForm] = useState<{ id?: string; name: string; width: string; height: string } | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      setPlots(await pb.collection('plots').getFullList<Plot>({ sort: 'created' }))
    } catch (e) {
      toast(pbError(e))
      setPlots([])
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    const width = Number(form.width)
    const height = Number(form.height)
    if (!(width >= 2 && width <= 1000 && height >= 2 && height <= 1000)) {
      toast('Размеры участка — от 2 до 1000 метров')
      return
    }
    setBusy(true)
    try {
      if (form.id) {
        await pb.collection('plots').update(form.id, { name: form.name, width, height })
      } else {
        const rec = await pb.collection('plots').create<Plot>({
          name: form.name,
          width,
          height,
          owner: pb.authStore.record?.id,
        })
        setLastPlot(rec.id)
        setForm(null)
        nav(`/plot/${rec.id}`)
        return
      }
      setForm(null)
      load()
    } catch (err) {
      toast(pbError(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove(plot: Plot) {
    if (!confirm(`Удалить участок «${plot.name}» со всем планом и журналом? Это нельзя отменить.`))
      return
    try {
      await pb.collection('plots').delete(plot.id)
      setForm(null)
      load()
    } catch (err) {
      toast(pbError(err))
    }
  }

  return (
    <div className="page">
      <div className="top-bar">
        <h1>Мои участки</h1>
      </div>

      {plots === null && <div className="spinner" />}

      {plots !== null && plots.length === 0 && (
        <div className="empty">
          <span className="empty-emoji">🏡</span>
          <h2>Добавьте свой участок</h2>
          <p>Укажите размеры — и можно рисовать план: дом, клумбы, деревья, дорожки.</p>
        </div>
      )}

      {plots !== null && (
        <div className="list">
          {plots.map((p) => (
            <div key={p.id} className="row" style={{ paddingRight: 4 }}>
              <span
                className="row-emoji"
                role="button"
                onClick={() => {
                  setLastPlot(p.id)
                  nav(`/plot/${p.id}`)
                }}
              >
                🏡
              </span>
              <button
                className="row-body"
                style={{ background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'inherit' }}
                onClick={() => {
                  setLastPlot(p.id)
                  nav(`/plot/${p.id}`)
                }}
              >
                <div className="row-title">{p.name}</div>
                <div className="row-sub">
                  {p.width} × {p.height} м
                </div>
              </button>
              <button
                className="icon-btn"
                aria-label="Настройки участка"
                onClick={() =>
                  setForm({ id: p.id, name: p.name, width: String(p.width), height: String(p.height) })
                }
              >
                ✏️
              </button>
            </div>
          ))}
        </div>
      )}

      <button className="btn" onClick={() => setForm({ name: 'Мой сад', width: '20', height: '15' })}>
        + Новый участок
      </button>

      {form && (
        <Sheet title={form.id ? 'Участок' : 'Новый участок'} onClose={() => setForm(null)}>
          <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="field">
              <span>Название</span>
              <input
                className="input"
                required
                maxLength={120}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <label className="field" style={{ flex: 1 }}>
                <span>Ширина, м</span>
                <input
                  className="input"
                  type="number"
                  inputMode="decimal"
                  min={2}
                  max={1000}
                  required
                  value={form.width}
                  onChange={(e) => setForm({ ...form, width: e.target.value })}
                />
              </label>
              <label className="field" style={{ flex: 1 }}>
                <span>Длина, м</span>
                <input
                  className="input"
                  type="number"
                  inputMode="decimal"
                  min={2}
                  max={1000}
                  required
                  value={form.height}
                  onChange={(e) => setForm({ ...form, height: e.target.value })}
                />
              </label>
            </div>
            <button className="btn btn--block" disabled={busy}>
              {form.id ? 'Сохранить' : 'Создать участок'}
            </button>
            {form.id && (
              <button
                type="button"
                className="btn btn--danger btn--block"
                onClick={() => remove(plots!.find((p) => p.id === form.id)!)}
              >
                Удалить участок
              </button>
            )}
          </form>
        </Sheet>
      )}
    </div>
  )
}
