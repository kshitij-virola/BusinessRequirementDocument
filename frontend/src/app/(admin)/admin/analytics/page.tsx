'use client'

import { BarChart2 } from 'lucide-react'

const AdminAnalyticsPage = () => {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-gray-400 mt-0.5">Revenue, user growth, and AI usage reports</p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-20 text-center">
        <BarChart2 className="h-10 w-10 text-gray-600 mb-4" />
        <p className="text-sm font-medium text-gray-400">Analytics coming in Phase 3</p>
        <p className="text-xs text-gray-600 mt-1">Revenue reports, subscription trends, and AI usage costs</p>
      </div>
    </div>
  )
}

export default AdminAnalyticsPage
