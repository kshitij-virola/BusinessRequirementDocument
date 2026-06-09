'use client'
import { FolderOpen, Zap, Download, CreditCard, Activity, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import StatsCard from '@/components/dashboard/StatsCard'
import { RecentActivity } from '@/components/dashboard/RecentActivity'
import { Button } from '@/components/ui/Button'
import { useDashboardStats, useRecentActivity } from '@/lib/api/hooks'

const DashboardPage = () => {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: recent, isLoading: recentLoading } = useRecentActivity()

  if (statsLoading) {
    return (
      <div className="space-y-5 sm:space-y-6 animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-secondary" />
        <div className="h-16 rounded-xl bg-secondary" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-secondary" />
          ))}
        </div>
      </div>
    )
  }

  const planLabel = stats?.subscriptionPlan
    ? `${stats.subscriptionPlan.charAt(0).toUpperCase() + stats.subscriptionPlan.slice(1)} Plan`
    : 'Free Plan'

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Welcome back! Here&apos;s your overview.</p>
        </div>
        <Link href="/dashboard/workspaces/new">
          <Button className="w-full sm:w-auto">
            <Zap className="h-4 w-4" />
            New Chat
          </Button>
        </Link>
      </div>

      {/* Subscription banner */}
      <div className="rounded-xl border border-violet-500/30 bg-violet-600/10 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-violet-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">{planLabel}</p>
            <p className="text-xs text-gray-400">{stats?.creditsRemaining ?? 0} credits remaining this month</p>
          </div>
        </div>
        <Link href="/dashboard/billing" className="self-start sm:self-auto">
          <Button variant="outline" size="sm">Upgrade Plan</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        <StatsCard label="Total Projects"   value={stats?.totalProjects    ?? 0} icon={FolderOpen} accent="violet" />
        <StatsCard label="Active"           value={stats?.activeProjects   ?? 0} icon={Activity}   accent="emerald" />
        <StatsCard label="Generations"      value={stats?.totalGenerations ?? 0} icon={Zap}         accent="amber" />
        <StatsCard label="Credits Left"     value={stats?.creditsRemaining ?? 0} icon={CreditCard}  accent="blue" />
        <StatsCard label="Downloads"        value={stats?.downloads        ?? 0} icon={Download}    accent="violet" className="col-span-2 sm:col-span-1" />
      </div>

      <RecentActivity generations={recent ?? []} isLoading={recentLoading} />
    </div>
  )
}

export default DashboardPage;
