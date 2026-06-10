'use client'
import { useState } from 'react'
import Badge from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useAdminStats, useAdminLogs } from '@/lib/api/hooks'

type TxStatus = 'paid' | 'failed' | 'refunded' | 'cancelled'

const statusVariant: Record<TxStatus, 'success' | 'danger' | 'muted' | 'warning'> = {
  paid: 'success', failed: 'danger', refunded: 'muted', cancelled: 'warning',
}

const actionToStatus = (action: string): TxStatus => {
  if (action === 'payment.success') return 'paid'
  if (action === 'payment.failed')  return 'failed'
  if (action === 'payment.refund')  return 'refunded'
  return 'cancelled'
}

const formatAmount = (meta?: Record<string, unknown>) => {
  if (!meta?.amountCents) return '—'
  const dollars = (meta.amountCents as number) / 100
  const currency = (meta.currency as string | undefined)?.toUpperCase() ?? 'USD'
  return `${currency} $${dollars.toFixed(2)}`
}

const PAYMENT_ACTIONS = [
  { label: 'All Payment Events', value: '' },
  { label: 'Successful',         value: 'payment.success' },
  { label: 'Failed',             value: 'payment.failed'  },
  { label: 'Refunded',           value: 'payment.refund'  },
]

const PaymentsPage = () => {
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data: stats } = useAdminStats()
  const { data, isLoading } = useAdminLogs({
    actionPrefix: actionFilter ? undefined : 'payment',
    action: actionFilter || undefined,
    page,
  })

  const logs = data?.logs ?? []

  const exportCsv = () => {
    const header = 'ID,User,Action,Amount,Plan,Date'
    const rows = logs.map(l => {
      const meta = l.metadata
      return [
        l._id,
        l.actor,
        l.action,
        formatAmount(meta),
        meta?.plan ?? '',
        new Date(l.createdAt).toISOString(),
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    })
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5 sm:space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Payment Management</h1>
          <p className="text-sm text-gray-400 mt-0.5">Transactions, refunds, failed payments, and renewals</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value); setPage(1) }}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500">
            {PAYMENT_ACTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <Button variant="secondary" size="sm" disabled={logs.length === 0} onClick={exportCsv}>Export CSV</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { label: 'Monthly Revenue', value: stats ? `$${stats.mrr.toLocaleString()}` : '—', sub: 'MRR' },
          { label: 'Annual Revenue',  value: stats ? `$${stats.arr.toLocaleString()}` : '—', sub: 'ARR' },
          { label: 'Conversion Rate', value: stats ? `${stats.conversionRate}%` : '—', sub: 'Paid users' },
          { label: 'AI Spend',        value: stats ? `$${stats.aiCostUsd.toFixed(2)}` : '—', sub: 'All time' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Transactions table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-sm">
            <thead>
              <tr className="border-b border-border text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Plan</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Date</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={5} className="px-4 py-3"><div className="h-6 rounded bg-secondary animate-pulse" /></td></tr>
                ))
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500 text-sm">No payment events found</td></tr>
              ) : logs.map(log => {
                const status = actionToStatus(log.action)
                const plan = log.metadata?.plan as string | undefined
                const user = log.userId
                return (
                  <tr key={log._id} className="hover:bg-secondary transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-foreground font-medium truncate max-w-[160px]">
                        {user ? user.email : log.actor}
                      </p>
                      {user && <p className="text-xs text-gray-500 font-mono">{log._id.slice(-8)}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden sm:table-cell capitalize">{plan ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{formatAmount(log.metadata)}</td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3"><Badge variant={statusVariant[status]}>{status}</Badge></td>
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

export default PaymentsPage
