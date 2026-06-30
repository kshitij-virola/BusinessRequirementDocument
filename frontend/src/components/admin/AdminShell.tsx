'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, CreditCard, Settings, Menu, X,
  Bot, ScrollText, DollarSign, BarChart2,
} from 'lucide-react'
import Logo from '@/components/ui/Logo'
import SignOutButton from '@/components/auth/SignOutButton'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'

// BRD 3.3 — Admin capabilities
const adminNavItems = [
  { label: 'Dashboard',         href: '/admin/dashboard',  icon: LayoutDashboard },
  { label: 'Manage Users',      href: '/admin/users',      icon: Users           },
  { label: 'Manage Plans',      href: '/admin/plans',      icon: CreditCard      },
  { label: 'Manage Payments',   href: '/admin/payments',   icon: DollarSign      },
  { label: 'View Analytics',    href: '/admin/analytics',  icon: BarChart2       },
  { label: 'Manage AI Models',  href: '/admin/ai-config',  icon: Bot             },
]

// BRD 3.4 — Super Admin capabilities
const superAdminNavItems = [
  { label: 'Dashboard',         href: '/admin/dashboard',  icon: LayoutDashboard },
  { label: 'Manage Users',      href: '/admin/users',      icon: Users           },
  { label: 'Manage Plans',      href: '/admin/plans',      icon: CreditCard      },
  { label: 'Manage Payments',   href: '/admin/payments',   icon: DollarSign      },
  { label: 'View Analytics',    href: '/admin/analytics',  icon: BarChart2       },
  { label: 'Manage AI Models',  href: '/admin/ai-config',  icon: Bot             },
  { label: 'Audit Logs',        href: '/admin/audit-logs', icon: ScrollText      },
  { label: 'Platform Settings', href: '/admin/settings',   icon: Settings        },
]

const AdminNav = ({ role, onClose }: { role: UserRole; onClose?: () => void }) => {
  const pathname = usePathname()
  const items = role === 'superadmin' ? superAdminNavItems : adminNavItems

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-6 border-b border-border">
        <div className="flex items-center gap-2">
          <Logo size="md" />
          <span className="text-xs text-gray-500 font-medium">
            {role === 'superadmin' ? 'Super Admin' : 'Admin'}
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-secondary hover:text-foreground transition-colors lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {items.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted hover:bg-secondary hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3 space-y-1">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-secondary hover:text-foreground transition-colors"
        >
          Back to App
        </Link>
        <SignOutButton className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-secondary hover:text-red-400 transition-colors" />
      </div>
    </div>
  )
}

const AdminShell = ({ role, children }: { role: UserRole; children: React.ReactNode }) => {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden lg:flex h-full w-64 shrink-0 flex-col border-r border-border bg-background">
        <AdminNav role={role} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-background shadow-2xl z-50">
            <AdminNav role={role} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-muted hover:bg-secondary hover:text-foreground transition-colors lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="text-sm font-semibold text-foreground">
              {role === 'superadmin' ? 'Super Admin Panel' : 'Admin Panel'}
            </span>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}

export default AdminShell
