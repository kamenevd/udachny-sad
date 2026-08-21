import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { pb, pbError, setLastPlot, useAuth } from '../lib/pb'
import type { Plot, PlotInvite } from '../lib/types'
import Sheet from '../ui/Sheet'
import { toast } from '../ui/toast'

export default function PlotsPage() {
  const nav = useNavigate()
  const { email, userId } = useAuth()
  const [plots, setPlots] = useState<Plot[] | null>(null)
  const [form, setForm] = useState<{ id?: string; name: string; width: string; height: string } | null>(null)
  const [sharePlot, setSharePlot] = useState<Plot | null>(null)
  const [busy, setBusy] = useState(false)
  const [familyEnabled, setFamilyEnabled] = useState(true)

  async function ensureOwnerInvite(plot: Plot) {
    if (!familyEnabled) return
    if (!email || !userId || plot.owner !== userId) return
    const ownerEmail = email.trim().toLowerCase()
    if (!ownerEmail) return
    const rows = await pb.collection('plot_invites').getFullList<PlotInvite>({
      filter: pb.filter('plot = {:plot} && email = {:email}', { plot: plot.id, email: ownerEmail }),
    })
    const row = rows[0]
    if (!row) {
      await pb.collection('plot_invites').create({
        plot: plot.id,
        email: ownerEmail,
        status: 'accepted',
        user: userId,
        invited_by: userId,
      })
      return
    }
    if (row.status !== 'accepted' || row.user !== userId) {
      await pb.collection('plot_invites').update(row.id, {
        status: 'accepted',
        user: userId,
      })
    }
  }

  async function acceptPendingInvites() {
    if (!familyEnabled) return
    if (!email || !userId) return
    try {
      const me = email.trim().toLowerCase()
      if (!me) return
      const invited = await pb.collection('plot_invites').getFullList<PlotInvite>({
        filter: pb.filter('email = {:email} && status = "invited"', { email: me }),
      })
      if (invited.length === 0) return
      let accepted = 0
      for (const row of invited) {
        try {
          await pb.collection('plots').update(row.plot, {
            'members+': userId,
          })
          await pb.collection('plot_invites').update(row.id, {
            status: 'accepted',
            user: userId,
          })
          accepted += 1
        } catch {
          // Ошибки отдельных приглашений не останавливают вход в приложение.
        }
      }
      if (accepted > 0) {
        toast(
          accepted === 1
            ? 'Вы присоединились к семейному саду 👨‍🌾'
            : `Вы присоединились к ${accepted} семейным садам 👨‍🌾`,
        )
      }
    } catch (e) {
      const status = (e as { status?: number })?.status
      if (status === 400 || status === 404) {
        setFamilyEnabled(false)
        return
      }
      throw e
    }
  }

  async function load() {
    try {
      await acceptPendingInvites()
      const items = await pb.collection('plots').getFullList<Plot>({ sort: 'created' })
      setPlots(items)
      await Promise.all(
        items
          .filter((p) => p.owner === userId)
          .map(async (p) => {
            try {
              await ensureOwnerInvite(p)
            } catch {
              // Если реестр участников не создался, сам участок всё равно доступен.
              setFamilyEnabled(false)
            }
          }),
      )
    } catch (e) {
      toast(pbError(e))
      setPlots([])
    }
  }

  useEffect(() => {
    load()
  }, [email, userId])

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
        let rec: Plot
        try {
          rec = await pb.collection('plots').create<Plot>({
            name: form.name,
            width,
            height,
            owner: pb.authStore.record?.id,
            members: [],
          })
        } catch (e) {
          if ((e as { status?: number })?.status !== 400) throw e
          setFamilyEnabled(false)
          rec = await pb.collection('plots').create<Plot>({
            name: form.name,
            width,
            height,
            owner: pb.authStore.record?.id,
          })
        }
        try {
          await ensureOwnerInvite(rec)
        } catch {
          setFamilyEnabled(false)
        }
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
      {!familyEnabled && (
        <p className="muted">
          Семейный сад станет доступен после обновления API (схемы PocketBase).
        </p>
      )}

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
                  {(p.members?.length ?? 0) > 0 && ` · семья: ${1 + (p.members?.length ?? 0)} чел.`}
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
            {form.id && (
              <button
                type="button"
                className="btn btn--secondary btn--block"
                disabled={!familyEnabled}
                onClick={() => {
                  if (!familyEnabled) return
                  const plot = plots?.find((p) => p.id === form.id)
                  if (!plot) return
                  setForm(null)
                  setSharePlot(plot)
                }}
              >
                👥 {familyEnabled ? 'Семейный сад' : 'Семейный сад (нужно обновить API)'}
              </button>
            )}
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

      {sharePlot && familyEnabled && (
        <FamilyGardenSheet
          plot={sharePlot}
          myEmail={email}
          myUserId={userId}
          onClose={() => setSharePlot(null)}
          onChanged={() => {
            setSharePlot(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function FamilyGardenSheet({
  plot,
  myEmail,
  myUserId,
  onClose,
  onChanged,
}: {
  plot: Plot
  myEmail: string
  myUserId: string
  onClose: () => void
  onChanged: () => void
}) {
  const isOwner = plot.owner === myUserId
  const me = myEmail.trim().toLowerCase()
  const [email, setEmail] = useState('')
  const [invites, setInvites] = useState<PlotInvite[] | null>(null)
  const [busy, setBusy] = useState(false)

  async function loadInvites() {
    try {
      setInvites(
        await pb.collection('plot_invites').getFullList<PlotInvite>({
          filter: pb.filter('plot = {:plot}', { plot: plot.id }),
          sort: 'email',
        }),
      )
    } catch (e) {
      toast(pbError(e))
      setInvites([])
    }
  }

  useEffect(() => {
    loadInvites()
  }, [plot.id])

  const accepted = (invites ?? []).filter((i) => i.status === 'accepted')
  const invited = (invites ?? []).filter((i) => i.status === 'invited')
  const hasOwnerRow = accepted.some((i) => i.user === plot.owner)

  async function invite() {
    if (!isOwner) return
    const next = email.trim().toLowerCase()
    if (!next || !next.includes('@')) {
      toast('Введите email участника')
      return
    }
    const exists = (invites ?? []).find((i) => i.email === next)
    if (exists?.status === 'accepted') {
      toast('Этот человек уже в семейном саду')
      return
    }
    if (exists?.status === 'invited') {
      toast('Приглашение уже отправлено')
      return
    }
    setBusy(true)
    try {
      await pb.collection('plot_invites').create({
        plot: plot.id,
        email: next,
        status: 'invited',
        invited_by: myUserId,
      })
      setEmail('')
      await loadInvites()
      toast(`Приглашение отправлено: ${next}`)
    } catch (e) {
      toast(pbError(e))
    } finally {
      setBusy(false)
    }
  }

  async function removeInvite(i: PlotInvite) {
    if (!confirm(`Отменить приглашение для ${i.email}?`)) return
    setBusy(true)
    try {
      await pb.collection('plot_invites').delete(i.id)
      await loadInvites()
      toast('Приглашение отменено')
    } catch (e) {
      toast(pbError(e))
    } finally {
      setBusy(false)
    }
  }

  async function removeMember(i: PlotInvite) {
    if (!i.user || i.user === plot.owner) return
    if (!confirm(`Убрать ${i.email} из семейного сада?`)) return
    setBusy(true)
    try {
      await pb.collection('plots').update(plot.id, { 'members-': i.user })
      await pb.collection('plot_invites').delete(i.id)
      await loadInvites()
      toast('Участник удалён')
      onChanged()
    } catch (e) {
      toast(pbError(e))
    } finally {
      setBusy(false)
    }
  }

  async function leaveGarden() {
    if (isOwner) return
    if (!confirm('Выйти из семейного сада? Данные участка останутся у других участников.')) return
    setBusy(true)
    try {
      await pb.collection('plots').update(plot.id, { 'members-': myUserId })
      const mine = (invites ?? []).find((i) => i.email === me)
      if (mine) await pb.collection('plot_invites').delete(mine.id)
      toast('Вы вышли из семейного сада')
      onChanged()
    } catch (e) {
      toast(pbError(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title="Семейный сад" onClose={onClose}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h3>{plot.name}</h3>
        <p className="muted">Один участок на всех: план, посадки и журнал общие.</p>
      </div>

      {isOwner && (
        <div className="field">
          <span>Пригласить по email</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sad@example.ru"
            />
            <button className="btn btn--secondary" type="button" onClick={invite} disabled={busy}>
              Пригласить
            </button>
          </div>
        </div>
      )}

      <div className="section-title">Кто в саду</div>
      <div className="list">
        {!hasOwnerRow && (
          <div className="row" style={{ cursor: 'default' }}>
            <span className="row-emoji">👑</span>
            <div className="row-body">
              <div className="row-title">Владелец участка</div>
              <div className="row-sub">создатель сада</div>
            </div>
          </div>
        )}
        {accepted.map((i) => {
          const isPlotOwner = i.user === plot.owner
          const isMe = i.email === me
          return (
            <div key={i.id} className="row" style={{ cursor: 'default' }}>
              <span className="row-emoji">{isPlotOwner ? '👑' : '👤'}</span>
              <div className="row-body">
                <div className="row-title">{i.email}</div>
                <div className="row-sub">
                  {isPlotOwner ? 'владелец' : isMe ? 'это вы' : 'участник'}
                </div>
              </div>
              {isOwner && !isPlotOwner && (
                <button className="btn btn--danger btn--small" onClick={() => removeMember(i)} disabled={busy}>
                  Убрать
                </button>
              )}
            </div>
          )
        })}
      </div>

      {invited.length > 0 && (
        <>
          <div className="section-title">Ожидают подтверждения</div>
          <div className="list">
            {invited.map((i) => (
              <div key={i.id} className="row" style={{ cursor: 'default' }}>
                <span className="row-emoji">✉️</span>
                <div className="row-body">
                  <div className="row-title">{i.email}</div>
                  <div className="row-sub">приглашение отправлено</div>
                </div>
                {isOwner && (
                  <button className="btn btn--danger btn--small" onClick={() => removeInvite(i)} disabled={busy}>
                    Отменить
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {!isOwner && (
        <button type="button" className="btn btn--danger btn--block" onClick={leaveGarden} disabled={busy}>
          Выйти из семейного сада
        </button>
      )}
    </Sheet>
  )
}
