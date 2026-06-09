'use client'
import { useState } from 'react'
import { BarChart2, TrendingUp, Zap, Download } from 'lucide-react'
import StatsCard from '@/components/dashboard/StatsCard'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

type Period = 'week' | 'month'

const weekData = [
  { label: 'Mon', credits: 3, generations: 3 },
  { label: 'Tue', credits: 5, generations: 5 },
  { label: 'Wed', credits: 1, generations: 1 },
  { label: 'Thu', credits: 8, generations: 8 },
  { label: 'Fri', credits: 2, generations: 2 },
  { label: 'Sat', credits: 6, generations: 6 },
  { label: 'Sun', credits: 4, generations: 4 },
]

const monthData = [
  { label: 'W1', credits: 18, generations: 18 },
  { label: 'W2', credits: 24, generations: 22 },
  { label: 'W3', credits: 11, generations: 10 },
  { label: 'W4', credits: 30, generations: 28 },
]

const downloadHistory = [
  { id: '1', name: 'SaaS Dashboard v3',  framework: 'React',   size: '1.2 MB', date: new Date(Date.now() - 3.6e6).toISOString()   },
  { id: '2', name: 'Landing Page v1',    framework: 'HTML/CSS', size: '480 KB', date: new Date(Date.now() - 8.64e7).toISOString()  },
  { id: '3', name: 'E-commerce v2',      framework: 'Vue',      size: '2.1 MB', date: new Date(Date.now() - 1.728e8).toISOString() },
]

const BarChart = ({ data, valueKey }: { data: { label: string; [k: string]: number | string }[]; valueKey: string }) => {
  const max = Math.max(...data.map((d) => Number(d[valueKey])))
  return (
    <div className="flex items-end gap-2 sm:gap-3 h-32 sm:h-40">
      {data.map((d) => {
        const pct = max > 0 ? (Number(d[valueKey]) / max) * 100 : 0
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1.5 group">
            <span className="text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">{d[valueKey]}</span>
            <div className="w-full flex flex-col justify-end" style={{ height: '100%' }}>
              <div
                className="w-full rounded-t-md bg-violet-600/70 hover:bg-violet-500 transition-colors cursor-pointer"
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

const AnalyticsPage = () => {
  const [period, setPeriod] = useState<Period>('week')
  const chartData = period === 'week' ? weekData : monthData

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-gray-400 mt-0.5">Your usage stats and generation history</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatsCard label="Total Generations" value="83" icon={Zap}       accent="violet" trend={{ value: 12, direction: 'up' }} />
        <StatsCard label="Credits Used"      value="83" icon={BarChart2} accent="amber"  />
        <StatsCard label="Downloads"         value="5"  icon={Download}  accent="emerald"/>
        <StatsCard label="Success Rate"      value="94%" icon={TrendingUp} accent="blue" trend={{ value: 3, direction: 'up' }} className="col-span-2 sm:col-span-1" />
      </div>

      {/* Chart with period toggle */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-5 sm:mb-6">
          <h2 className="text-sm sm:text-base font-semibold text-foreground">Credit Consumption</h2>
          <div className="flex rounded-lg border border-border p-0.5">
            {(['week', 'month'] as Period[]).map((p) => (
              <button key={p} type="button" onClick={() => setPeriod(p)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors capitalize',
                  period === p ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-foreground'
                )}>
                {p === 'week' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>
        </div>
        <BarChart data={chartData} valueKey="credits" />
      </div>

      {/* Generation history */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Generation History</h2>
          <select className="rounded-lg border border-border bg-secondary px-2 py-1 text-xs text-foreground focus:outline-none">
            <option>All Frameworks</option>
            <option>React</option>
            <option>Vue</option>
            <option>HTML/CSS</option>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { prompt: 'Create a SaaS dashboard with Tailwind', fw: 'React',    status: 'completed', credits: 1 },
                { prompt: 'Build a landing page with hero section', fw: 'HTML/CSS', status: 'completed', credits: 1 },
                { prompt: 'E-commerce product grid with filters',   fw: 'Vue',      status: 'failed',    credits: 0 },
              ].map((g, i) => (
                <tr key={i} className="hover:bg-secondary transition-colors">
                  <td className="px-4 py-3 text-gray-300 max-w-[200px] truncate">{g.prompt}</td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{g.fw}</td>
                  <td className="px-4 py-3">
                    <Badge variant={g.status === 'completed' ? 'success' : 'danger'}>{g.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{g.credits}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Download history */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Download History</h2>
        </div>
        <div className="divide-y divide-border">
          {downloadHistory.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-secondary transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{d.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{d.framework} &middot; {d.size} &middot; {formatDate(d.date)}</p>
              </div>
              <button type="button" title="Re-download"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-secondary hover:text-foreground transition-colors shrink-0">
                <Download className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AnalyticsPage;
