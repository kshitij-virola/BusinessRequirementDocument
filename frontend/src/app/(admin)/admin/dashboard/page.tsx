'use client'

import { Users, DollarSign, Zap, TrendingUp } from 'lucide-react'
import StatsCard from '@/components/dashboard/StatsCard'
import { useAdminStats } from '@/lib/api/hooks'

const AdminDashboardPage = () => {
  const { data, isLoading } = useAdminStats()

  if (isLoading) {
    return (
      <div className="space-y-6 p-4 sm:p-6 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-secondary" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-secondary" />)}
        </div>
      </div>
    )
  }

  const mrr = data?.mrr ?? 0
  const arr = data?.arr ?? 0

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">Platform overview and KPIs</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatsCard label="Total Users"      value={(data?.totalUsers ?? 0).toLocaleString()} icon={Users}       accent="violet" />
        <StatsCard label="MRR"              value={`$${mrr.toLocaleString()}`}               icon={DollarSign}  accent="emerald" />
        <StatsCard label="ARR"              value={`$${arr.toLocaleString()}`}               icon={TrendingUp}  accent="blue" />
        <StatsCard label="AI Requests"      value={(data?.aiRequests ?? 0).toLocaleString()} icon={Zap}         accent="amber" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { label: 'New Users (30d)',   value: data?.newRegistrations ?? 0 },
          { label: 'Active Users',      value: data?.activeUsers ?? 0 },
          { label: 'AI Cost (USD)',      value: `$${(data?.aiCostUsd ?? 0).toFixed(2)}` },
          { label: 'Conversion Rate',   value: `${data?.conversionRate ?? '0'}%` },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AdminDashboardPage;
