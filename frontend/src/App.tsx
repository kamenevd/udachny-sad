import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { getLastPlot, useAuth } from './lib/pb'
import { useToast } from './ui/toast'
import AuthPage from './pages/AuthPage'
import PlotsPage from './pages/PlotsPage'
import PlanPage from './pages/PlanPage'
import PlantsPage from './pages/PlantsPage'
import PlantingPage from './pages/PlantingPage'
import PlacePage from './pages/PlacePage'
import JournalPage from './pages/JournalPage'
import MorePage from './pages/MorePage'

function RequireAuth({ children }: { children: ReactNode }) {
  const { valid } = useAuth()
  if (!valid) return <Navigate to="/auth" replace />
  return children
}

function HomeRedirect() {
  const last = getLastPlot()
  return <Navigate to={last ? `/plot/${last}` : '/plots'} replace />
}

function BottomNav() {
  const { pathname } = useLocation()
  const last = getLastPlot()
  const planTo = last ? `/plot/${last}` : '/plots'
  const planActive = pathname.startsWith('/plot')
  return (
    <nav className="bottom-nav">
      <NavLink to={planTo} className={planActive ? 'active' : ''}>
        <span className="nav-emoji">🗺️</span>
        План
      </NavLink>
      <NavLink to="/plants">
        <span className="nav-emoji">🌷</span>
        Растения
      </NavLink>
      <NavLink to="/journal">
        <span className="nav-emoji">📖</span>
        Журнал
      </NavLink>
      <NavLink to="/more">
        <span className="nav-emoji">☰</span>
        Ещё
      </NavLink>
    </nav>
  )
}

function Toast() {
  const msg = useToast((s) => s.msg)
  if (!msg) return null
  return <div className="toast">{msg}</div>
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      {children}
      <BottomNav />
    </RequireAuth>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <HomeRedirect />
            </RequireAuth>
          }
        />
        <Route path="/plots" element={<Shell><PlotsPage /></Shell>} />
        <Route path="/plot/:id" element={<Shell><PlanPage /></Shell>} />
        <Route path="/plants" element={<Shell><PlantsPage /></Shell>} />
        <Route path="/journal" element={<Shell><JournalPage /></Shell>} />
        <Route path="/more" element={<Shell><MorePage /></Shell>} />
        <Route path="/planting/:id" element={<Shell><PlantingPage /></Shell>} />
        <Route path="/place/:id" element={<Shell><PlacePage /></Shell>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toast />
    </BrowserRouter>
  )
}
