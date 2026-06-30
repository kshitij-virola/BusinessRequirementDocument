'use client'

import { Users, DollarSign, Zap, TrendingUp } from 'lucide-react'
import StatsCard from '@/components/dashboard/StatsCard'
import Badge from '@/components/ui/Badge'
import { useAdminStats, useAdminUsers, useAdminLogs } from '@/lib/api/hooks'
import type { AuditLogEntry } from '@/lib/api/types'

const PlanDistribution = () => {
  const { data: freeData,   isLoading: l1 } = useAdminUsers({ plan: 'free' })
  const { data: proData,    isLoading: l2 } = useAdminUsers({ plan: 'pro' })
  const { data: agencyData, isLoading: l3 } = useAdminUsers({ plan: 'agency' })

  const isLoading = l1 || l2 || l3
  const free   = freeData?.total   ?? 0
  const pro    = proData?.total    ?? 0
  const agency = agencyData?.total ?? 0
  const total  = free + pro + agency

  const plans = [
    { label: 'Free',   count: free,   bar: 'bg-gray-500' },
    { label: 'Pro',    count: pro,    bar: 'bg-primary' },
    { label: 'Agency', count: agency, bar: 'bg-emerald-500' },
  ]

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
      <h3 className="text-sm font-semibold text-foreground">Plan Distribution</h3>
      {isLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 rounded bg-secondary" />
              <div className="h-2 rounded-full bg-secondary" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {plans.map(p => {
            const pct = total > 0 ? Math.round((p.count / total) * 100) : 0
            return (
              <div key={p.label} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">{p.label}</span>
                  <span className="text-foreground font-medium">
                    {p.count.toLocaleString()} <span className="text-gray-500">({pct}%)</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${p.bar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
          <p className="text-xs text-gray-500">{total.toLocaleString()} total users</p>
        </div>
      )}
    </div>
  )
}

const subEventVariant = (action: string): 'success' | 'warning' | 'danger' | 'muted' => {
  if (action.endsWith('.create') || action.endsWith('.upgrade')) return 'success'
  if (action.endsWith('.cancel')) return 'danger'
  if (action.endsWith('.downgrade')) return 'warning'
  return 'muted'
}

const AdminAnalyticsPage = () => {
  const { data: stats, isLoading } = useAdminStats()
  const { data: subLogs, isLoading: logsLoading } = useAdminLogs({ actionPrefix: 'subscription' })

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-6 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-secondary" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-secondary" />)}
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-secondary" />)}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="h-48 rounded-xl bg-secondary" />
          <div className="h-48 rounded-xl bg-secondary" />
        </div>
      </div>
    )
  }

  const mrr = stats?.mrr ?? 0
  const arr = stats?.arr ?? 0
  const aiCost = stats?.aiCostUsd ?? 0
  const aiRequests = stats?.aiRequests ?? 0
  const totalTokens = stats?.totalTokens ?? 0
  const totalUsers = stats?.totalUsers ?? 0
  const activeUsers = stats?.activeUsers ?? 0
  const activeRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0
  const costPerReq = aiRequests > 0 ? aiCost / aiRequests : 0
  const tokensPerReq = aiRequests > 0 ? Math.round(totalTokens / aiRequests) : 0
  const tokenDisplay = totalTokens >= 1_000_000
    ? `${(totalTokens / 1_000_000).toFixed(1)}M`
    : totalTokens.toLocaleString()

  const logs = subLogs?.logs ?? []

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-gray-400 mt-0.5">Revenue, user growth, and AI usage reports</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatsCard label="Total Users"     value={totalUsers.toLocaleString()}       icon={Users}      accent="violet" />
        <StatsCard label="MRR"             value={`$${mrr.toLocaleString()}`}        icon={DollarSign} accent="emerald" />
        <StatsCard label="AI Requests"     value={aiRequests.toLocaleString()}       icon={Zap}        accent="amber" />
        <StatsCard label="Conversion Rate" value={`${stats?.conversionRate ?? 0}%`}  icon={TrendingUp} accent="blue" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { label: 'ARR',             value: `$${arr.toLocaleString()}`,                         sub: 'Annual run rate' },
          { label: 'Active Users',    value: `${activeUsers.toLocaleString()} (${activeRate}%)`, sub: 'Of total users' },
          { label: 'AI Cost (USD)',    value: `$${aiCost.toFixed(2)}`,                            sub: 'All time' },
          { label: 'New Users (30d)', value: (stats?.newRegistrations ?? 0).toLocaleString(),    sub: 'Last 30 days' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">AI Usage Breakdown</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Tokens',         value: tokenDisplay },
              { label: 'Total Requests',        value: aiRequests.toLocaleString() },
              { label: 'Avg Cost / Request',    value: `$${costPerReq.toFixed(4)}` },
              { label: 'Avg Tokens / Request',  value: tokensPerReq.toLocaleString() },
            ].map(m => (
              <div key={m.label} className="rounded-lg bg-secondary p-3">
                <p className="text-xs text-gray-400">{m.label}</p>
                <p className="text-lg font-bold text-foreground mt-1">{m.value}</p>
              </div>
            ))}
          </div>
        </div>

        <PlanDistribution />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 sm:px-5 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Recent Subscription Events</h3>
          <p className="text-xs text-gray-500 mt-0.5">New subscriptions, upgrades, and cancellations</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Plan</th>
                <th className="px-4 py-3 text-left">Event</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logsLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="px-4 py-3">
                      <div className="h-5 rounded bg-secondary animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-500 text-sm">
                    No subscription events found
                  </td>
                </tr>
              ) : logs.map((log: AuditLogEntry) => (
                <tr key={log._id} className="hover:bg-secondary transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground truncate max-w-[160px]">
                      {log.userId ? log.userId.email : log.actor}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell capitalize">
                    {(log.metadata?.plan as string | undefined) ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={subEventVariant(log.action)}>
                      {log.action.replace('subscription.', '')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell text-xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AdminAnalyticsPage
