import { NavLink, Route, Routes } from 'react-router-dom'
import ComparePage from './pages/ComparePage'
import HomePage from './pages/HomePage'
import GlobeRadarPage from './pages/GlobeRadarPage'

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
    isActive ? 'bg-sky-500/20 text-sky-200' : 'text-slate-400 hover:text-white'
  }`

export default function App() {
  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold tracking-tight text-white">
            SkyRoute <span className="text-sky-400">India</span>
          </span>
          <div className="flex gap-2">
            <NavLink to="/" className={linkClass} end>
              Dashboard
            </NavLink>
            <NavLink to="/compare" className={linkClass}>
              Compare
            </NavLink>
            <NavLink to="/radar" className={linkClass}>
              Global Radar
            </NavLink>
          </div>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/radar" element={<GlobeRadarPage />} />
      </Routes>
      <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-600">
        FastAPI · NetworkX · React · Recharts · Force graph visualization
      </footer>
    </div>
  )
}
