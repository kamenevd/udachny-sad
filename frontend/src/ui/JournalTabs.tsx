import { NavLink } from 'react-router-dom'

/** Переключатель «Записи | Фото» вверху журнала. */
export default function JournalTabs() {
  return (
    <div className="seg-tabs">
      <NavLink to="/journal" end className={({ isActive }) => (isActive ? 'active' : '')}>
        📝 Записи
      </NavLink>
      <NavLink to="/photos" end className={({ isActive }) => (isActive ? 'active' : '')}>
        🖼️ Фото
      </NavLink>
    </div>
  )
}
