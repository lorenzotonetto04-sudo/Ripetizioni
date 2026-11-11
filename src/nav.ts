import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FolderOpen,
  ClipboardList,
  GraduationCap,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = { to: string; label: string; icon: LucideIcon }

export const adminNav: NavItem[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/studenti', label: 'Studenti', icon: Users },
  { to: '/lezioni', label: 'Lezioni', icon: CalendarDays },
  { to: '/verifiche', label: 'Verifiche', icon: ClipboardList },
  { to: '/materiali', label: 'Materiali', icon: FolderOpen },
  { to: '/voti', label: 'Voti', icon: GraduationCap },
  { to: '/pagamenti', label: 'Pagamenti', icon: Wallet },
]

export const studentNav: NavItem[] = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/lezioni', label: 'Lezioni', icon: CalendarDays },
  { to: '/materiale', label: 'Materiale', icon: FolderOpen },
  { to: '/verifiche', label: 'Verifiche', icon: ClipboardList },
  { to: '/voti', label: 'Voti', icon: GraduationCap },
  { to: '/pagamenti', label: 'Pagamenti', icon: Wallet },
]
