'use client'
import { useState } from 'react'
import Badge from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useAdminLogs } from '@/lib/api/hooks'

type ActionType = 'user' | 'admin' | 'payment' | 'ai'

const typeVariant: Record<string, 'default' | 'success' | 'warning' | 'muted'> = {
  admin: 'warning', user: 'muted', payment: 'success', ai: 'default',
}

const getType = (action: string): ActionType => {
  if (action.startsWith('admin'))        return 'admin'
  if (action.startsWith('payment') || action.startsWith('subscription')) return 'payment'
  if (action.startsWith('generation') || action.startsWith('credits')) return 'ai'
  return 'user'
}

const AuditLogsPage = () => {
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(1)
  const { data, isLoading } = useAdminLogs({ action: actionFilter || undefined, page })
  const logs = data?.logs ?? []

  return (
    <div className="space-y-5 sm:space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track user actions, admin changes, and payment activities</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1) }}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500">
            <option value="">All Types</option>
            <option value="user.register">Registrations</option>
            <option value="user.login">Logins</option>
            <option value="generation.start">AI Generations</option>
            <option value="payment.success">Payments</option>
            <option value="admin.suspend_user">Admin Actions</option>
          </select>
          <Button variant="secondary" size="sm">Export CSV</Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-sm">
            <thead>
              <tr className="border-b border-border text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Actor</th>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Type</th>
                <th className="px-4 py-3 text-left">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={4} className="px-4 py-3"><div className="h-6 rounded bg-secondary animate-pulse" /></td></tr>
                ))
              ) : logs.map((log) => {
                const t = getType(log.action)
                return (
                  <tr key={log._id} className="hover:bg-secondary transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-foreground font-medium truncate">{log.actor}</p>
                      <p className="text-xs text-gray-500">{log.actorRole}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-300 max-w-xs"><p className="truncate">{log.action}</p></td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant={typeVariant[t]} className="capitalize">{t}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-3 flex items-center justify-between">
          <p className="text-sm text-gray-500">Showing {logs.length} of {data?.total ?? 0} entries</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <Button variant="secondary" size="sm" disabled={logs.length < 50} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuditLogsPage;
