import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Cpu, Bot, CreditCard, Shield, LogOut } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getConfig, refrescarConfig } from '../lib/config'

const tabs = [
  { to: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { to: '/dispositivos', label: 'Equipos', icon: Cpu },
  { to: '/asistente', label: 'Asistente', icon: Bot },
  { to: '/planes', label: 'Planes', icon: CreditCard },
]

export default function AppShell() {
  const { user, signOut } = useAuth()
  const [cfg, setCfg] = useState(getConfig())
  const isAdmin = user?.rol === 'administrador'

  useEffect(() => {
    refrescarConfig().then(setCfg)
  }, [])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <img src="/bolt.png" alt="" className="w-8 h-8 rounded-lg" style={{ background: 'var(--color-primary)', padding: 4 }} />
          <span className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>{cfg.appName}</span>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <NavLink
              to="/admin"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: 'var(--color-warning)', color: '#1a1204' }}
            >
              <Shield size={14} /> Panel Admin
            </NavLink>
          )}
          <button onClick={signOut} className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-dim)' }}>
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>

      {isAdmin && (
        <div
          className="max-w-lg mx-auto w-full px-4 mt-3 flex items-center justify-between rounded-xl px-3 py-2"
          style={{ background: 'rgba(245,165,36,0.12)', border: '1px solid var(--color-warning)' }}
        >
          <span className="text-xs" style={{ color: 'var(--color-warning)' }}>Sesión de administrador activa</span>
          <NavLink to="/admin" className="text-xs font-semibold underline" style={{ color: 'var(--color-warning)' }}>
            Ir al panel →
          </NavLink>
        </div>
      )}

      <main className="flex-1 px-4 pt-4 pb-24 max-w-lg mx-auto w-full">
        <Outlet />
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 flex justify-around py-2"
        style={{ background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}
      >
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to} to={to}
            className={({ isActive }) => 'flex flex-col items-center gap-0.5 px-3 py-1 text-[11px]'}
            style={({ isActive }) => ({ color: isActive ? 'var(--color-primary)' : 'var(--color-text-dim)' })}
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
