'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, MessageSquare, FolderOpen, CreditCard,
  BarChart2, Settings, X, Menu, Bell,
  User, ChevronDown, Search,
} from 'lucide-react'
import Logo from '@/components/ui/Logo'
import SignOutButton from '@/components/auth/SignOutButton'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { cn } from '@/lib/utils'
import { useMe } from '@/lib/api/hooks'

// ── Nav config ────────────────────────────────────────────────────────────────

const navItems = [
  { label: 'Dashboard',   href: '/dashboard',  icon: LayoutDashboard },
  { label: 'Workspaces',  href: '/workspaces', icon: MessageSquare   },
  { label: 'Projects',    href: '/projects',   icon: FolderOpen      },
  { label: 'Billing',     href: '/billing',    icon: CreditCard      },
  { label: 'Analytics',   href: '/analytics',  icon: BarChart2       },
  { label: 'Settings',    href: '/settings',   icon: Settings        },
]

const pageTitles: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/workspaces':   'Workspaces',
  '/projects':     'Projects',
  '/billing':      'Billing',
  '/analytics':    'Analytics',
  '/settings':     'Settings',
}

const usePageTitle = () => {
  const pathname = usePathname()
  if (pathname.startsWith('/workspaces/new'))       return 'New Chat'
  else if (pathname.startsWith('/workspaces/chat')) return 'New Chat'
  else if (pathname.startsWith('/thread'))          return 'Chat'
  else if (pathname.startsWith('/workspaces/'))     return 'Workspace'
  else if (pathname.startsWith('/projects/new'))    return 'New Project'
  else if (pathname.match(/\/dashboard\/projects\/[^/]+$/)) return 'Project'
  return pageTitles[pathname] ?? 'Dashboard'
}

// ── Sidebar nav content ───────────────────────────────────────────────────────

const NavContent = ({ onClose }: { onClose?: () => void }) => {
  const pathname = usePathname()
  return (
    <div className="flex h-full flex-col">
      {/* Logo row — matches topbar height (80px) */}
      <div className="flex h-20 items-center justify-between px-5 border-b border-border">
        <Logo size="md" />
        {onClose && (
          <button type="button" onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-secondary hover:text-foreground transition-colors lg:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation links */}
      <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== '/dashboard' && pathname.startsWith(href + '/')) ||
            (href !== '/dashboard' && pathname === href)
          return (
            <Link key={href} href={href} onClick={onClose}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:bg-secondary hover:text-foreground'
              )}
            >
              <Icon className={cn(
                'h-4 w-4 shrink-0 transition-colors duration-150',
                active ? 'text-primary' : 'text-gray-400 group-hover:text-foreground'
              )} />
              {label}
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
            </Link>
          )
        })}
      </nav>

      {/* Sign out */}
      <div className="border-t border-border p-3">
        <SignOutButton className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-secondary hover:text-error transition-colors duration-150" />
      </div>
    </div>
  )
}

// ── User dropdown ─────────────────────────────────────────────────────────────

const userMenuItems = [
  { label: 'My Profile',  href: '/settings', icon: User       },
  { label: 'Settings',    href: '/settings', icon: Settings   },
  { label: 'Billing',     href: '/billing',  icon: CreditCard },
]

const UserMenu = () => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { data: me } = useMe()

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const initial = me?.name?.[0]?.toUpperCase() ?? '?'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl p-1 hover:bg-secondary transition-colors duration-150"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white shrink-0">
          {initial}
        </div>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted transition-transform hidden sm:block', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-border bg-card z-50 overflow-hidden"
          style={{ boxShadow: 'var(--shadow-modal)' }}>
          {/* User info header */}
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{me?.name ?? 'Loading...'}</p>
            <p className="text-xs text-muted mt-0.5 truncate">{me?.email ?? ''}</p>
          </div>

          {/* Menu items */}
          <div className="p-1.5 space-y-0.5">
            {userMenuItems.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-foreground/70 hover:bg-secondary hover:text-foreground transition-colors duration-150"
              >
                <Icon className="h-4 w-4 text-muted" />
                {label}
              </Link>
            ))}
          </div>

          {/* Sign out */}
          <div className="border-t border-border p-1.5">
            <SignOutButton className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-error hover:bg-error/10 transition-colors duration-150" />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Notification bell ─────────────────────────────────────────────────────────

const NotificationBell = () => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // TODO: replace with real notifications API
  const notifications = [
    { id: '1', text: 'Your theme generation is complete', time: '2 min ago',  unread: true  },
    { id: '2', text: 'Credits running low — 12 remaining', time: '1 hr ago',  unread: true  },
    { id: '3', text: 'Welcome to TROO AI!',                time: '2 days ago', unread: false },
  ]

  const unread = notifications.filter((n) => n.unread).length

  return (
    <div ref={ref} className="relative">
      {/* <button type="button" onClick={() => setOpen((o) => !o)} className="relative rounded-xl p-2 text-muted hover:bg-secondary hover:text-foreground transition-colors duration-150">
        <Bell className="h-5 w-5" />{unread > 0 && (<span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">{unread}</span>)}</button> */}

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border border-border bg-card z-50 overflow-hidden"
          style={{ boxShadow: 'var(--shadow-modal)' }}>
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <button type="button" className="text-xs text-primary hover:text-primary-hover transition-colors duration-150">
              Mark all read
            </button>
          </div>

          <div className="divide-y divide-border max-h-72 overflow-y-auto">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  'flex gap-3 px-4 py-3 cursor-pointer hover:bg-secondary transition-colors duration-150',
                  n.unread && 'bg-primary/5'
                )}
              >
                {n.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                {!n.unread && <span className="mt-1.5 h-2 w-2 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm leading-snug', n.unread ? 'text-foreground' : 'text-muted')}>{n.text}</p>
                  <p className="text-xs text-muted mt-0.5">{n.time}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border px-4 py-2.5 text-center">
            <button type="button" className="text-xs text-primary hover:text-primary-hover transition-colors duration-150">
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Topbar ────────────────────────────────────────────────────────────────────

const Topbar = ({ onMenuClick }: { onMenuClick: () => void }) => {
  const title = usePageTitle()
  const [searchOpen, setSearchOpen] = useState(false)
  const { data: me } = useMe()

  return (
    <header className="flex h-20 shrink-0 items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-4 sm:px-6 gap-3">
      {/* Left: hamburger + title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-xl p-2 text-muted hover:bg-secondary hover:text-foreground transition-colors duration-150 lg:hidden shrink-0"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="font-heading text-base sm:text-lg font-semibold text-foreground truncate">{title}</h1>
      </div>

      {/* Right: search + credits + bell + user */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Search — expands on click */}
        {searchOpen ? (
          <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary px-3 py-1.5">
            <Search className="h-4 w-4 text-muted shrink-0" />
            <input
              autoFocus
              placeholder="Search..."
              onBlur={() => setSearchOpen(false)}
              className="w-32 sm:w-48 bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="rounded-xl p-2 text-muted hover:bg-secondary hover:text-foreground transition-colors duration-150"
            title="Search"
          >
            <Search className="h-5 w-5" />
          </button>
        )}

        {/* Credits badge */}
        <div className="hidden md:flex items-center gap-1.5 rounded-xl bg-primary/10 border border-primary/20 px-3 py-1.5 text-sm">
          <span className="text-muted text-xs">Credits</span>
          <span className="font-semibold text-primary">{me?.credits.remaining ?? '...'}</span>
        </div>

        <ThemeToggle />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export const SidebarWrapper = ({ children }: { children: React.ReactNode }) => {
  const [mobileOpen, setMobileOpen] = useState(false)
  const close = useCallback(() => setMobileOpen(false), [])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex h-full w-64 shrink-0 flex-col border-r border-border bg-card">
        <NavContent />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-card z-50"
            style={{ boxShadow: 'var(--shadow-modal)' }}>
            <NavContent onClose={close} />
          </aside>
        </div>
      )}

      {/* Content column */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
