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
  { label: 'Dashboard',  href: '/dashboard',  icon: LayoutDashboard },
  { label: 'Workspaces', href: '/workspaces', icon: MessageSquare   },
  { label: 'Projects',   href: '/projects',   icon: FolderOpen      },
  { label: 'Billing',    href: '/billing',    icon: CreditCard      },
  { label: 'Analytics',  href: '/analytics',  icon: BarChart2       },
  { label: 'Settings',   href: '/settings',   icon: Settings        },
]

export const Sidebar = () => {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="flex h-20 items-center px-6 border-b border-border">
        <Logo size="md" />
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted hover:bg-secondary hover:text-foreground'
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-gray-400')} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-border p-3">
        <SignOutButton className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-secondary hover:text-error transition-colors duration-150" />
      </div>
    </aside>
  )
}
