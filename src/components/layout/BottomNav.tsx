import { NavLink } from 'react-router-dom'
import type { UserRole } from '../../types'

interface NavItem {
  to: string
  label: string
  icon: string
}

function getNavItems(role: UserRole): NavItem[] {
  const base: NavItem[] = [
    { to: '/', label: 'Accueil', icon: '🏠' },
    { to: '/laurapiades', label: 'Laurapiades', icon: '🏆' },
    { to: '/profil', label: 'Profil', icon: '👤' },
  ]

  if (role === 'admin_general') {
    return [
      ...base,
      { to: '/admin/roles', label: 'Rôles', icon: '👑' },
      { to: '/admin/events', label: 'Événements', icon: '🎪' },
      { to: '/admin/bonus', label: 'Bonus', icon: '⚡' },
    ]
  }
  if (role === 'admin_jeux') {
    return [
      ...base,
      { to: '/admin/epreuves', label: 'Épreuves', icon: '🎮' },
      { to: '/admin/classement', label: 'Classement', icon: '📊' },
    ]
  }
  if (role === 'admin_ventes') {
    return [
      ...base,
      { to: '/admin/depense', label: 'Dépense', icon: '🛒' },
      { to: '/admin/catalogue', label: 'Catalogue', icon: '📦' },
    ]
  }

  return base
}

interface BottomNavProps {
  role: UserRole
}

export function BottomNav({ role }: BottomNavProps) {
  const items = getNavItems(role)

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-mobile bg-white border-t border-border z-40">
      <div className="flex">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-nunito transition-colors ${
                isActive ? 'text-pink-fluo' : 'text-purple-mid'
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span className="leading-tight text-center">{item.label}</span>
          </NavLink>
        ))}
      </div>
      <div className="h-safe-area-inset-bottom" />
    </nav>
  )
}
