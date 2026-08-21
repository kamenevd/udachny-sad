import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { pb, useAuth } from '../lib/pb'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

let deferredInstall: InstallPromptEvent | null = null
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredInstall = e as InstallPromptEvent
  })
}

export default function MorePage() {
  const { email } = useAuth()
  const nav = useNavigate()
  const [canInstall, setCanInstall] = useState(!!deferredInstall)

  useEffect(() => {
    const onPrompt = () => setCanInstall(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  return (
    <div className="page">
      <div className="top-bar">
        <h1>Ещё</h1>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 32 }}>👤</span>
        <div>
          <h3>{email}</h3>
          <p className="muted">Ваш аккаунт</p>
        </div>
      </div>

      <div className="list">
        <Link className="row" to="/plots">
          <span className="row-emoji">🏡</span>
          <div className="row-body">
            <div className="row-title">Мои участки</div>
            <div className="row-sub">Добавить или изменить участок</div>
          </div>
        </Link>
        <Link className="row" to="/roadmap">
          <span className="row-emoji">🌱</span>
          <div className="row-body">
            <div className="row-title">Что зреет</div>
            <div className="row-sub">Что пишем сейчас, что уже есть и что потом</div>
          </div>
        </Link>
        {canInstall && (
          <button
            className="row"
            onClick={async () => {
              await deferredInstall?.prompt()
              deferredInstall = null
              setCanInstall(false)
            }}
          >
            <span className="row-emoji">📲</span>
            <div className="row-body">
              <div className="row-title">Установить на телефон</div>
              <div className="row-sub">Значок на экране, работает как приложение</div>
            </div>
          </button>
        )}
        <button
          className="row"
          onClick={() => {
            pb.authStore.clear()
            nav('/auth', { replace: true })
          }}
        >
          <span className="row-emoji">🚪</span>
          <div className="row-body">
            <div className="row-title">Выйти</div>
          </div>
        </button>
      </div>

      <p className="muted" style={{ textAlign: 'center' }}>
        уДачный сад — память вашего сада из года в год.
        <br />
        Нарисуйте план, отмечайте посадки, ведите журнал.
      </p>
    </div>
  )
}
