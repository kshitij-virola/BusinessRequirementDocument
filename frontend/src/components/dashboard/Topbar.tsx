import { Bell } from 'lucide-react'
import type { User } from '@/types'
import Badge from '@/components/ui/Badge'
import ThemeToggle from '@/components/ui/ThemeToggle'

interface TopbarProps {
  user?: User | null
  title?: string
}

const Topbar = ({ user, title }: TopbarProps) => {
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  return (
    <header className="flex h-20 items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-6">
      <h1 className="font-heading text-lg font-semibold text-foreground">{title ?? 'Dashboard'}</h1>

      <div className="flex items-center gap-4">
        {user?.creditsRemaining !== undefined && (
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <span className="text-muted">Credits:</span>
            <Badge variant="default">{user.creditsRemaining.toLocaleString()}</Badge>
          </div>
        )}

        <ThemeToggle />

        <button
          type="button"
          className="relative rounded-xl p-2 text-muted hover:bg-secondary hover:text-foreground transition-colors duration-150"
        >
          <Bell className="h-5 w-5" />
        </button>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
          {initials}
        </div>
      </div>
    </header>
  )
}

export default Topbar;
