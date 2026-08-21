import { useEffect, useState } from 'react'
import { fileUrl, pb, pbError } from '../lib/pb'
import type { Plant } from '../lib/types'
import { PLANT_TYPE_MENU, PLANT_TYPES, plantEmoji } from '../lib/catalog'
import { recognizePlant } from '../lib/plantVision'
import Sheet from '../ui/Sheet'
import PhotoInput from '../ui/PhotoInput'
import { toast } from '../ui/toast'

interface FormState {
  id?: string
  name: string
  cultivar: string
  ptype: string
  notes: string
  photo: File[]
  currentPhoto?: string
}

export default function PlantsPage() {
  const [plants, setPlants] = useState<Plant[] | null>(null)
  const [q, setQ] = useState('')
  const [form, setForm] = useState<FormState | null>(null)
  const [busy, setBusy] = useState(false)
  const [lookingPhoto, setLookingPhoto] = useState(false)

  /** Новое растение с фото и без названия — пусть фото само его назовёт. */
  async function fillFromPhoto(files: File[], current: FormState) {
    if (current.id || !files[0] || current.name.trim()) return
    setLookingPhoto(true)
    const guess = await recognizePlant(files[0], pb.authStore.token)
    setLookingPhoto(false)
    if (!guess) {
      toast('Не узнали — напишите, что это')
      return
    }
    setForm((prev) => {
      if (!prev || prev.id || prev.name.trim()) return prev
      return {
        ...prev,
        name: guess.name,
        cultivar: prev.cultivar || guess.cultivar,
        ptype: guess.ptype,
      }
    })
  }
  async function load() {
    try {
      setPlants(await pb.collection('plants').getFullList<Plant>({ sort: 'name' }))
    } catch (e) {
      toast(pbError(e))
      setPlants([])
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = (plants ?? []).filter((p) =>
    (p.name + ' ' + p.cultivar).toLowerCase().includes(q.toLowerCase()),
  )

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setBusy(true)
    try {
      const data = new FormData()
      data.set('name', form.name.trim())
      data.set('cultivar', form.cultivar.trim())
      data.set('ptype', form.ptype)
      data.set('notes', form.notes)
      if (form.photo[0]) data.set('photo', form.photo[0])
      if (form.id) {
        await pb.collection('plants').update(form.id, data)
      } else {
        data.set('owner', pb.authStore.record?.id ?? '')
        await pb.collection('plants').create(data)
      }
      setForm(null)
      load()
    } catch (err) {
      toast(pbError(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove(p: Plant) {
    if (!confirm(`Удалить «${p.name}» из списка растений?`)) return
    try {
      await pb.collection('plants').delete(p.id)
      setForm(null)
      load()
    } catch {
      toast('Не получилось: растение отмечено на плане. Сначала уберите его посадки.')
    }
  }

  return (
    <div className="page">
      <div className="top-bar">
        <h1>Мои растения</h1>
      </div>

      <input
        className="input"
        placeholder="Поиск…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {plants === null && <div className="spinner" />}

      {plants !== null && plants.length === 0 && (
        <div className="empty">
          <span className="empty-emoji">🌷</span>
          <h2>Пока пусто</h2>
          <p>Добавьте растения — свои гортензии, розы, туи. Потом отметите их на плане.</p>
        </div>
      )}

      <div className="list">
        {filtered.map((p) => (
          <button
            key={p.id}
            className="row"
            onClick={() =>
              setForm({
                id: p.id,
                name: p.name,
                cultivar: p.cultivar,
                ptype: p.ptype || 'perennial',
                notes: p.notes,
                photo: [],
                currentPhoto: p.photo,
              })
            }
          >
            {p.photo ? (
              <img className="row-thumb" src={fileUrl(p, p.photo, '100x100')} alt="" />
            ) : (
              <span className="row-emoji">{plantEmoji(p.ptype)}</span>
            )}
            <div className="row-body">
              <div className="row-title">{p.name}</div>
              <div className="row-sub">
                {p.cultivar && `«${p.cultivar}» · `}
                {p.ptype ? PLANT_TYPES[p.ptype as keyof typeof PLANT_TYPES]?.label : ''}
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        className="btn"
        onClick={() => setForm({ name: '', cultivar: '', ptype: 'perennial', notes: '', photo: [] })}
      >
        + Добавить растение
      </button>

      {form && (
        <Sheet title={form.id ? 'Растение' : 'Новое растение'} onClose={() => setForm(null)}>
          <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <label className="field">
              <span>Название</span>
              <input
                className="input"
                required
                maxLength={160}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Гортензия метельчатая"
              />
            </label>
            <label className="field">
              <span>Сорт (необязательно)</span>
              <input
                className="input"
                maxLength={160}
                value={form.cultivar}
                onChange={(e) => setForm({ ...form, cultivar: e.target.value })}
                placeholder="Limelight"
              />
            </label>
            <label className="field">
              <span>Тип</span>
              <select
                className="input"
                value={form.ptype}
                onChange={(e) => setForm({ ...form, ptype: e.target.value })}
              >
                {PLANT_TYPE_MENU.map((t) => (
                  <option key={t} value={t}>
                    {PLANT_TYPES[t].emoji} {PLANT_TYPES[t].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Заметки</span>
              <textarea
                className="input"
                maxLength={4000}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Любит полутень, боится сквозняков…"
              />
            </label>
            <div className="field">
              <span>Фото</span>
              {form.currentPhoto && form.photo.length === 0 && (
                <p className="muted">Фото уже загружено — выберите новое, чтобы заменить.</p>
              )}
              <PhotoInput
                files={form.photo}
                onChange={(f) => {
                  setForm({ ...form, photo: f })
                  fillFromPhoto(f, form)
                }}
                max={1}
              />
              {lookingPhoto && (
                <div className="quick-looking">
                  <div className="spinner" />
                  <span>Смотрим фото…</span>
                </div>
              )}
            </div>
            <button className="btn btn--block" disabled={busy}>
              {busy ? 'Сохраняем…' : 'Сохранить'}
            </button>
            {form.id && (
              <button
                type="button"
                className="btn btn--danger btn--block"
                onClick={() => remove(plants!.find((p) => p.id === form.id)!)}
              >
                Удалить растение
              </button>
            )}
          </form>
        </Sheet>
      )}
    </div>
  )
}
