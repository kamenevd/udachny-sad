import { useEffect, useMemo, useState } from 'react'
import { pb } from '../lib/pb'
import type { Plant } from '../lib/types'
import { PLANT_TYPE_MENU, PLANT_TYPES, plantEmoji } from '../lib/catalog'
import Sheet from '../ui/Sheet'
import { usePlan } from './store'

/**
 * «Посадка одним касанием», шаг после снимка:
 * фото уже есть, человек пишет название — и идёт выбирать место на плане.
 */
export default function QuickPlantSheet({ photo, onClose }: { photo: File; onClose: () => void }) {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [ptype, setPtype] = useState('perennial')
  const [plants, setPlants] = useState<Plant[]>([])
  const [picked, setPicked] = useState<Plant | null>(null)

  useEffect(() => {
    const u = URL.createObjectURL(photo)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [photo])

  // Свои растения — чтобы не плодить дубли, если такое уже записано.
  useEffect(() => {
    pb.collection('plants')
      .getFullList<Plant>({ sort: 'name' })
      .then(setPlants)
      .catch(() => {})
  }, [])

  const query = name.trim().toLowerCase()
  const matches = useMemo(() => {
    if (picked || query.length < 2) return []
    return plants
      .filter((p) => `${p.name} ${p.cultivar}`.toLowerCase().includes(query))
      .slice(0, 3)
  }, [plants, query, picked])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const plantName = picked ? picked.name : name.trim()
    if (!plantName) return
    usePlan.getState().startQuickPlant(photo, {
      plantId: picked?.id ?? '',
      plantName,
      ptype: picked?.ptype || ptype,
      plantHasPhoto: !!picked?.photo,
    })
    onClose()
  }

  return (
    <Sheet title="Что посадили?" onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div className="quick-photo">
          <img src={url} alt="Снимок растения" />
        </div>

        {!picked && (
          <label className="field">
            <span>Название</span>
            <input
              className="input"
              required
              maxLength={160}
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Пион «Сара Бернар»"
            />
          </label>
        )}

        {matches.length > 0 && (
          <div className="quick-matches">
            <span className="muted">Уже есть в вашем списке — это оно?</span>
            {matches.map((p) => (
              <button
                type="button"
                key={p.id}
                className="quick-match"
                onClick={() => setPicked(p)}
              >
                {plantEmoji(p.ptype)} {p.name}
                {p.cultivar ? ` «${p.cultivar}»` : ''}
              </button>
            ))}
          </div>
        )}

        {picked && (
          <div className="row quick-picked">
            <span className="row-emoji">{plantEmoji(picked.ptype)}</span>
            <div className="row-body">
              <div className="row-title">{picked.name}</div>
              <div className="row-sub">
                {picked.cultivar ? `«${picked.cultivar}» · ` : ''}уже в списке — новая посадка
              </div>
            </div>
            <button
              type="button"
              className="icon-btn"
              aria-label="Не оно, ввести название"
              onClick={() => setPicked(null)}
            >
              ✕
            </button>
          </div>
        )}

        {!picked && (
          <div className="field">
            <span>Что это</span>
            <div className="etype-grid">
              {PLANT_TYPE_MENU.map((t) => (
                <button
                  type="button"
                  key={t}
                  className={ptype === t ? 'active' : ''}
                  onClick={() => setPtype(t)}
                >
                  <span className="e">{PLANT_TYPES[t].emoji}</span>
                  {PLANT_TYPES[t].label}
                </button>
              ))}
            </div>
          </div>
        )}

        <button className="btn btn--block">👉 Выбрать место на плане</button>
      </form>
    </Sheet>
  )
}
