import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { LogOut, MoreHorizontal } from 'lucide-react'
import type { NavItem } from '../nav'
import { useAuth } from '../auth'

export default function AppShell({ items }: { items: NavItem[] }) {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)

  // Chiude il menu "Altro" quando si cambia pagina
  useEffect(() => {
    setMoreOpen(false)
  }, [location.pathname])

  // Con molte voci, su smartphone ne mostra 4 e raggruppa le altre in "Altro"
  const useMore = items.length > 6
  const mainItems = useMore ? items.slice(0, 4) : items
  const extraItems = useMore ? items.slice(4) : []
  const moreActive = extraItems.some((i) => location.pathname.startsWith(i.to))

  return (
    <div className="shell">
      {/* Menu laterale (computer e tablet grandi) */}
      <aside className="sidebar">
        <div className="brand">Ripetizioni</div>
        <nav>
          {items.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
        <div className="sidebar-foot">
          <div className="muted small">{profile?.full_name}</div>
          <button className="nav-link" onClick={signOut}>
            <LogOut size={20} />
            <span>Esci</span>
          </button>
        </div>
      </aside>

      {/* Barra in alto (smartphone) */}
      <header className="topbar">
        <span className="brand">Ripetizioni</span>
        <button className="icon-btn" aria-label="Esci" onClick={signOut}>
          <LogOut size={22} />
        </button>
      </header>

      <main className="content">
        <div className="page">
          <Outlet />
        </div>
      </main>

      {/* Barra in basso (smartphone) */}
      <nav className="tabbar" aria-label="Navigazione principale">
        {mainItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}
            >
              <Icon size={22} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
        {useMore && (
          <button
            className={'tab' + (moreActive || moreOpen ? ' active' : '')}
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
          >
            <MoreHorizontal size={22} />
            <span>Altro</span>
          </button>
        )}
      </nav>

      {moreOpen && <div className="sheet-backdrop" onClick={() => setMoreOpen(false)} />}
      {moreOpen && (
        <div className="sheet">
          {extraItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      )}
    </div>
  )
}
