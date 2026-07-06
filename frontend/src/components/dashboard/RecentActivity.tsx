import Badge from '@/components/ui/Badge'
import { formatDate, formatCredits } from '@/lib/utils'
import type { RecentGeneration } from '@/lib/api/types'

interface RecentActivityProps {
  generations: RecentGeneration[]
  isLoading?: boolean
}

const statusVariants: Record<string, 'success' | 'warning' | 'danger' | 'muted' | 'default'> = {
  completed:  'success',
  processing: 'warning',
  failed:     'danger',
  pending:    'muted',
}

export const RecentActivity = ({ generations, isLoading }: RecentActivityProps) => {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">Recent Generations</h2>
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-secondary" />
          ))}
        </div>
      </div>
    )
  }

  if (!generations.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">Recent Generations</h2>
        <p className="text-sm text-gray-500 text-center py-8">No generations yet. Start a new chat!</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h2 className="text-base font-semibold text-foreground mb-4">Recent Generations</h2>
      <div className="space-y-3">
        {generations.map((gen) => (
          <div key={gen._id} className="flex items-start justify-between gap-4 rounded-lg p-3 hover:bg-secondary transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">{gen.prompt}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {gen.framework} &middot; {formatDate(gen.createdAt)} &middot; {formatCredits(gen.creditsUsed)} credit{Math.abs(gen.creditsUsed) !== 1 ? 's' : ''}
              </p>
            </div>
            <Badge variant={statusVariants[gen.status] ?? 'default'}>{gen.status}</Badge>
          </div>
        ))}
      </div>
    </div>
  )
}
