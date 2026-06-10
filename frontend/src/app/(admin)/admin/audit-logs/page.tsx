'use client'
import { useState, useCallback } from 'react'
import Badge from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useAdminLogs } from '@/lib/api/hooks'
import type { AuditLogEntry } from '@/lib/api/types'

type ActionType = 'user' | 'admin' | 'payment' | 'ai' | 'workspace'

const typeVariant: Record<ActionType, 'default' | 'success' | 'warning' | 'muted'> = {
  admin: 'warning', user: 'muted', payment: 'success', ai: 'default', workspace: 'muted',
}

const getType = (action: string): ActionType => {
  if (action.startsWith('admin'))        return 'admin'
  if (action.startsWith('payment') || action.startsWith('subscription')) return 'payment'
  if (action.startsWith('generation') || action.startsWith('credits'))   return 'ai'
  if (action.startsWith('workspace'))    return 'workspace'
  return 'user'
}

type FilterMode = { kind: 'prefix'; value: string } | { kind: 'exact'; value: string } | { kind: 'all' }

const FILTER_OPTIONS: { label: string; mode: FilterMode }[] = [
  { label: 'All Types',      mode: { kind: 'all' } },
  { label: 'User Actions',   mode: { kind: 'prefix', value: 'user' } },
  { label: 'Workspace',      mode: { kind: 'prefix', value: 'workspace' } },
  { label: 'AI Generations', mode: { kind: 'prefix', value: 'generation' } },
  { label: 'Credits',        mode: { kind: 'prefix', value: 'credits' } },
  { label: 'Payments',       mode: { kind: 'prefix', value: 'payment' } },
  { label: 'Subscriptions',  mode: { kind: 'prefix', value: 'subscription' } },
  { label: 'Admin Actions',  mode: { kind: 'prefix', value: 'admin' } },
  // specific actions
  { label: 'Registrations',  mode: { kind: 'exact', value: 'user.register' } },
  { label: 'Logins',         mode: { kind: 'exact', value: 'user.login' } },
  { label: 'Logouts',        mode: { kind: 'exact', value: 'user.logout' } },
  { label: 'Password Resets',mode: { kind: 'exact', value: 'user.password_reset' } },
]

const encodeMode = (m: FilterMode) => {
  if (m.kind === 'all') return ''
  return `${m.kind}:${m.value}`
}

const decodeMode = (v: string): FilterMode => {
  if (!v) return { kind: 'all' }
  const [kind, value] = v.split(':') as [FilterMode['kind'], string]
  return { kind, value } as FilterMode
}

const exportCsv = (logs: AuditLogEntry[]) => {
  const header = 'Actor,Role,Action,Type,Entity,Time'
  const rows = logs.map(l =>
    [l.actor, l.actorRole, l.action, getType(l.action), l.entityType ?? '', new Date(l.createdAt).toISOString()]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  )
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const AuditLogsPage = () => {
  const [filterValue, setFilterValue] = useState('')
  const [actorSearch, setActorSearch]   = useState('')
  const [actorDebounced, setActorDebounced] = useState('')
  const [page, setPage] = useState(1)

  const mode = decodeMode(filterValue)
  const queryParams = {
    ...(mode.kind === 'exact'  ? { action: mode.value } : {}),
    ...(mode.kind === 'prefix' ? { actionPrefix: mode.value } : {}),
    ...(actorDebounced ? { actor: actorDebounced } : {}),
    page,
  }

  const { data, isLoading } = useAdminLogs(queryParams)
  const logs = data?.logs ?? []

  const handleFilterChange = (v: string) => { setFilterValue(v); setPage(1) }

  const handleActorInput = useCallback((v: string) => {
    setActorSearch(v)
    clearTimeout((handleActorInput as { _t?: ReturnType<typeof setTimeout> })._t)
    ;(handleActorInput as { _t?: ReturnType<typeof setTimeout> })._t = setTimeout(() => {
      setActorDebounced(v)
      setPage(1)
    }, 400)
  }, [])

  return (
    <div className="space-y-5 sm:space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track user actions, admin changes, and payment activities</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search actor..."
            value={actorSearch}
            onChange={e => handleActorInput(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 w-40"
          />
          <select
            value={filterValue}
            onChange={e => handleFilterChange(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {FILTER_OPTIONS.map(o => (
              <option key={encodeMode(o.mode)} value={encodeMode(o.mode)}>{o.label}</option>
            ))}
          </select>
          <Button variant="secondary" size="sm" disabled={logs.length === 0} onClick={() => exportCsv(logs)}>
            Export CSV
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Actor</th>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Entity</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Type</th>
                <th className="px-4 py-3 text-left">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-6 rounded bg-secondary animate-pulse" /></td></tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500 text-sm">No logs found</td>
                </tr>
              ) : logs.map((log) => {
                const t = getType(log.action)
                return (
                  <tr key={log._id} className="hover:bg-secondary transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-foreground font-medium truncate max-w-[160px]">{log.actor}</p>
                      <p className="text-xs text-gray-500">{log.actorRole}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-300 max-w-xs"><p className="truncate">{log.action}</p></td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-500 text-xs">
                      {log.entityType && log.entityId
                        ? <span className="font-mono">{log.entityType}/{log.entityId.slice(-6)}</span>
                        : <span className="text-gray-700">—</span>}
                    </td>
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
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="secondary" size="sm" disabled={!data || logs.length < 50} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuditLogsPage;
