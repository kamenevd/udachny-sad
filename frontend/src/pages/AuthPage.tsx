import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { pb, useAuth } from '../lib/pb'

export default function AuthPage() {
  const { valid } = useAuth()
  const nav = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (valid) return <Navigate to="/" replace />

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Пароль должен быть не короче 8 символов')
      return
    }
    setBusy(true)
    try {
      if (mode === 'register') {
        await pb.collection('users').create({ email, password, passwordConfirm: password })
      }
      await pb.collection('users').authWithPassword(email, password)
      nav('/', { replace: true })
    } catch (err) {
      const status = (err as { status?: number }).status
      if (mode === 'login' && status === 400) {
        setError('Неверная почта или пароль')
      } else if (mode === 'register' && status === 400) {
        setError('Не удалось создать аккаунт. Возможно, такая почта уже занята.')
      } else {
        setError('Нет связи с сервером. Попробуйте ещё раз.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-logo">
        <span className="logo-mark">🌳</span>
        <h1>уДачный сад</h1>
        <p>План участка и дневник вашего сада</p>
      </div>

      <div className="auth-tabs">
        <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
          Вход
        </button>
        <button
          className={mode === 'register' ? 'active' : ''}
          onClick={() => setMode('register')}
        >
          Регистрация
        </button>
      </div>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label className="field">
          <span>Электронная почта</span>
          <input
            className="input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sad@example.ru"
          />
        </label>
        <label className="field">
          <span>Пароль</span>
          <input
            className="input"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="не короче 8 символов"
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn--block" disabled={busy}>
          {busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
        </button>
      </form>

      <p className="muted" style={{ textAlign: 'center' }}>
        {mode === 'login'
          ? 'Первый раз здесь? Нажмите «Регистрация».'
          : 'Аккаунт хранит ваши участки, растения и журнал.'}
      </p>
    </div>
  )
}
