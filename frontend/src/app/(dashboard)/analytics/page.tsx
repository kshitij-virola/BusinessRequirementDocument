'use client'
import { useState, useMemo } from 'react'
import { BarChart2, TrendingUp, Zap, Download } from 'lucide-react'
import StatsCard from '@/components/dashboard/StatsCard'
import Badge from '@/components/ui/Badge'
import { formatDate, formatCredits } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { useDashboardStats, useCreditUsage, useGenerations } from '@/lib/api/hooks'
import { generationsApi } from '@/lib/api/generations'
import type { CreditUsagePoint, Generation } from '@/lib/api/types'

type Period = 'week' | 'month'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const normalizeChart = (data: CreditUsagePoint[], period: Period) => {
  if (period === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const dateStr = d.toISOString().slice(0, 10)
      const found = data.find(p => p._id === dateStr)
      return { label: DAY_LABELS[d.getDay()], credits: Math.abs(found?.credits ?? 0) }
    })
  }
  const now = new Date()
  const weeks = [{ label: 'W1', credits: 0 }, { label: 'W2', credits: 0 }, { label: 'W3', credits: 0 }, { label: 'W4', credits: 0 }]
  data.forEach(p => {
    const daysAgo = Math.floor((now.getTime() - new Date(p._id).getTime()) / 86400000)
    const idx = 3 - Math.min(3, Math.floor(daysAgo / 7))
    weeks[idx].credits += Math.abs(p.credits)
  })
  return weeks;
}

const BarChart = ({ data }: { data: { label: string; credits: number }[] }) => {
  const max = Math.max(...data.map(d => d.credits), 1)
  return (
    <div className="flex items-end gap-2 sm:gap-3 h-32 sm:h-40">
      {data.map(d => {
        const pct = (d.credits / max) * 100
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5 group">
            <span className="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">{d.credits}</span>
            <div className="w-full flex flex-col justify-end" style={{ height: '100%' }}>
              <div
                className="w-full rounded-t-md bg-primary/70 hover:bg-primary transition-colors cursor-pointer"
                style={{ height: `${Math.max(4, pct)}%` }}
              />
            </div>
            <span className="text-[10px] sm:text-xs text-gray-500">{d.label}</span>
          </div>
        )
      })}
    </div>
  )
}

type PopulatedGen = Omit<Generation, 'workspaceId'> & { workspaceId?: { _id: string; name: string } | string }

const AnalyticsPage = () => {
  const [period, setPeriod] = useState<Period>('week')
  const [framework, setFramework] = useState('')
  const [genPage, setGenPage] = useState(1)
  const [downloading, setDownloading] = useState<string | null>(null)

  const { data: stats } = useDashboardStats()
  const { data: usageRaw, isLoading: chartLoading } = useCreditUsage(period)
  const { data: genData, isLoading: genLoading } = useGenerations({ framework: framework || undefined, page: genPage })
  const { data: dlData, isLoading: dlLoading } = useGenerations({ status: 'completed' })

  const chartData = useMemo(
    () => normalizeChart(usageRaw ?? [], period),
    [usageRaw, period]
  )

  const generations = (genData?.generations ?? []) as PopulatedGen[]
  const downloads = ((dlData?.generations ?? []) as PopulatedGen[]).filter(g => g.zipUrl)

  const handleDownload = async (id: string) => {
    setDownloading(id)
    try {
      const url = await generationsApi.getDownloadUrl(id)
      window.open(url, '_blank')
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-gray-400 mt-0.5">Your usage stats and generation history</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatsCard label="Total Generations" value={stats ? String(stats.totalGenerations) : '—'} icon={Zap}         accent="violet"  trend={{ value: 12, direction: 'up' }} />
        <StatsCard label="Credits Used"      value={stats ? formatCredits(stats.creditsUsed) : '—'} icon={BarChart2}   accent="amber"   trend={{ value: 12, direction: 'up' }} />
        <StatsCard label="Downloads"         value={stats ? String(stats.downloads) : '—'}        icon={Download}    accent="emerald" trend={{ value: 12, direction: 'up' }} />
        <StatsCard label="Success Rate"      value={stats ? `${stats.successRate}%` : '—'}        icon={TrendingUp}  accent="blue"    trend={{ value: 3, direction: 'down' }} className="col-span-2 sm:col-span-1" />
      </div>

      {/* Chart with period toggle */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <h2 className="text-sm sm:text-base font-semibold text-foreground">Credit Consumption</h2>
          <div className="flex rounded-lg border border-border p-0.5">
            {(['week', 'month'] as Period[]).map(p => (
              <button key={p} type="button" onClick={() => setPeriod(p)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors capitalize',
                  period === p ? 'bg-primary text-white' : 'text-muted hover:text-foreground'
                )}>
                {p === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>
        </div>
        {chartLoading ? (
          <div className="h-32 sm:h-40 rounded-lg bg-secondary animate-pulse" />
        ) : (
          <BarChart data={chartData} />
        )}
      </div>

      {/* Generation history */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Generation History</h2>
          <select
            value={framework}
            onChange={e => { setFramework(e.target.value); setGenPage(1) }}
            className="rounded-lg border border-border bg-secondary px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
            <option value="">All Frameworks</option>
            <option value="react">React</option>
            <option value="vue">Vue</option>
            <option value="angular">Angular</option>
            <option value="html">HTML/CSS</option>
            <option value="wordpress">WordPress</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-border text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Prompt</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Framework</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Credits</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {genLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-5 rounded bg-secondary animate-pulse" /></td></tr>
                ))
              ) : generations.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">No generations yet</td></tr>
              ) : generations.map(g => (
                <tr key={g._id} className="hover:bg-secondary transition-colors">
                  <td className="px-4 py-3 text-gray-300 max-w-[200px] truncate">{g.prompt}</td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell capitalize">{g.framework}</td>
                  <td className="px-4 py-3">
                    <Badge variant={g.status === 'completed' ? 'success' : g.status === 'failed' ? 'danger' : 'muted'}>
                      {g.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{formatCredits(g.creditsUsed)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{formatDate(g.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-gray-500">{genData?.total ?? 0} total</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={genPage <= 1}
              onClick={() => setGenPage(p => p - 1)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-gray-400 disabled:opacity-40 hover:text-foreground transition-colors">
              Previous
            </button>
            <button
              type="button"
              disabled={!genData || generations.length < 20}
              onClick={() => setGenPage(p => p + 1)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-gray-400 disabled:opacity-40 hover:text-foreground transition-colors">
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Download history */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Download History</h2>
        </div>
        <div className="divide-y divide-border">
          {dlLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-4 py-3"><div className="h-10 rounded bg-secondary animate-pulse" /></div>
            ))
          ) : downloads.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 text-sm">No downloads yet</div>
          ) : downloads.map(g => {
            const wsName = typeof g.workspaceId === 'object' && g.workspaceId ? g.workspaceId.name : null
            return (
              <div key={g._id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{wsName ?? g.prompt}</p>
                  <p className="text-xs text-gray-500 mt-0.5 capitalize">{g.framework} &middot; {formatDate(g.createdAt)}</p>
                </div>
                <button
                  type="button"
                  title="Re-download"
                  disabled={downloading === g._id}
                  onClick={() => handleDownload(g._id)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-secondary hover:text-foreground transition-colors shrink-0 disabled:opacity-40">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default AnalyticsPage
