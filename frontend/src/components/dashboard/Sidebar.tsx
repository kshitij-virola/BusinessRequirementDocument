'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquare,
  FolderOpen,
  CreditCard,
  BarChart2,
  Settings,
} from 'lucide-react'
import Logo from '@/components/ui/Logo'
import SignOutButton from '@/components/auth/SignOutButton'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Workspaces', href: '/dashboard/workspaces', icon: MessageSquare },
  { label: 'Projects', href: '/dashboard/projects', icon: FolderOpen },
  { label: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart2 },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
]

export const Sidebar = () => {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-background">
      <div className="flex h-16 items-center px-6 border-b border-border">
        <Logo size="md" />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-violet-600/20 text-violet-400'
                  : 'text-gray-400 hover:bg-secondary hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3">
        <SignOutButton className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 hover:bg-secondary hover:text-red-400 transition-colors" />
      </div>
    </aside>
  )
}
