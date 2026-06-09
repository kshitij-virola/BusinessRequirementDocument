import type { Metadata } from 'next'
import { verifyAdminSession } from '@/lib/dal'
import Badge from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'

export const metadata: Metadata = { title: 'Payments - TROO AI Admin' }

type TxStatus = 'paid' | 'failed' | 'refunded' | 'pending'

const transactions = [
  { id: 'tx_001', user: 'alice@example.com', plan: 'Pro',    amount: '$29.00', date: 'Jun 1, 2026',  status: 'paid' as TxStatus     },
  { id: 'tx_002', user: 'bob@example.com',   plan: 'Free',   amount: '$0.00',  date: 'Jun 1, 2026',  status: 'paid' as TxStatus     },
  { id: 'tx_003', user: 'carol@example.com', plan: 'Agency', amount: '$99.00', date: 'May 28, 2026', status: 'failed' as TxStatus   },
  { id: 'tx_004', user: 'dave@example.com',  plan: 'Pro',    amount: '$29.00', date: 'May 25, 2026', status: 'refunded' as TxStatus },
  { id: 'tx_005', user: 'eve@example.com',   plan: 'Agency', amount: '$99.00', date: 'May 20, 2026', status: 'paid' as TxStatus     },
]

const statusVariant: Record<TxStatus, 'success' | 'danger' | 'muted' | 'warning'> = {
  paid: 'success', failed: 'danger', refunded: 'muted', pending: 'warning',
}

const PaymentsPage = async () => {
  await verifyAdminSession()
  return (
    <div className="space-y-5 sm:space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Payment Management</h1>
          <p className="text-sm text-gray-400 mt-0.5">Transactions, refunds, failed payments, and renewals</p>
        </div>
        <Button variant="secondary" size="sm">Export CSV</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[
          { label: 'Total Revenue',    value: '$3,840',  sub: 'This month'  },
          { label: 'Failed Payments',  value: '3',       sub: 'Needs review' },
          { label: 'Refund Requests',  value: '1',       sub: 'Pending'     },
          { label: 'Active Renewals',  value: '128',     sub: 'Next 30 days' },
        ].map((s) => (
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
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-border text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Plan</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-secondary transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-foreground font-medium truncate max-w-[140px]">{tx.user}</p>
                    <p className="text-xs text-gray-500 font-mono">{tx.id}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{tx.plan}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{tx.amount}</td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{tx.date}</td>
                  <td className="px-4 py-3"><Badge variant={statusVariant[tx.status]}>{tx.status}</Badge></td>
                  <td className="px-4 py-3">
                    {tx.status === 'failed' && <Button size="sm" variant="ghost">Retry</Button>}
                    {tx.status === 'paid' && <Button size="sm" variant="ghost">Refund</Button>}
                    {tx.status === 'refunded' && <span className="text-xs text-gray-500">Refunded</span>}
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

export default PaymentsPage;
