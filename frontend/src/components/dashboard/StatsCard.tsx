import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: { value: number; direction: 'up' | 'down' }
  accent?: 'violet' | 'emerald' | 'amber' | 'blue'
  className?: string
}

const accentStyles = {
  violet: 'bg-primary/10 text-primary',
  emerald: 'bg-emerald-600/10 text-emerald-400',
  amber: 'bg-amber-600/10 text-amber-400',
  blue: 'bg-blue-600/10 text-blue-400',
}

const StatsCard = ({ label, value, icon: Icon, trend, accent = 'violet', className }: StatsCardProps) => {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 sm:p-5 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">{label}</span>
        <div className={cn('rounded-lg p-2', accentStyles[accent])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {trend && (
          <span
            className={cn(
              'text-xs font-medium',
              trend.direction === 'up' ? 'text-emerald-400' : 'text-red-400'
            )}
          >
            {trend.direction === 'up' ? '+' : '-'}{trend.value}%
          </span>
        )}
      </div>
    </div>
  )
}

export default StatsCard;
