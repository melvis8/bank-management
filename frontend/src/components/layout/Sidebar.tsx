import { NavLink } from 'react-router-dom'
import {
  ArrowLeftRight,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  History,
  Smartphone,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
}

const mainNav: NavItem[] = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Historique', icon: History },
  { to: '/transfer', label: 'Virement', icon: ArrowLeftRight },
  { to: '/payments', label: 'Mobile Money', icon: Smartphone },
]

const adminNav: NavItem[] = [
  { to: '/admin', label: "Vue d'ensemble", icon: LayoutGrid, end: true },
  { to: '/admin/users', label: 'Utilisateurs', icon: Users },
  { to: '/admin/accounts', label: 'Comptes', icon: Wallet },
  { to: '/admin/transactions', label: 'Transactions', icon: History },
  { to: '/admin/banks', label: 'Banques', icon: Landmark },
  { to: '/admin/payments', label: 'Paiements', icon: ShieldCheck },
]

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map(({ to, label, icon: Icon, end }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring',
                isActive && 'bg-sidebar-accent text-sidebar-foreground'
              )
            }
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {label}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}

interface SidebarProps {
  mobileOpen: boolean
  onClose: () => void
}

export function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const { isAdmin } = useAuth()

  const content = (
    <div className="flex h-full flex-col gap-6 bg-sidebar px-4 py-5 text-sidebar-foreground">
      <div className="flex items-center justify-between px-1">
        <span className="font-heading text-lg font-semibold tracking-tight">BMS</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer le menu"
          className="rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring md:hidden"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <nav className="flex flex-1 flex-col justify-between overflow-y-auto">
        <NavList items={mainNav} onNavigate={onClose} />
        {isAdmin && (
          <div className="mt-6">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Administration
            </p>
            <NavList items={adminNav} onNavigate={onClose} />
          </div>
        )}
      </nav>
    </div>
  )

  return (
    <>
      {/* Desktop: static sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border md:block">{content}</aside>

      {/* Mobile: off-canvas drawer */}
      <div
        className={cn(
          'fixed inset-0 z-40 md:hidden',
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          className={cn(
            'absolute inset-0 bg-black/40 transition-opacity',
            mobileOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={onClose}
        />
        <div
          className={cn(
            'absolute inset-y-0 left-0 w-72 max-w-[85vw] transition-transform duration-200 ease-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {content}
        </div>
      </div>
    </>
  )
}
