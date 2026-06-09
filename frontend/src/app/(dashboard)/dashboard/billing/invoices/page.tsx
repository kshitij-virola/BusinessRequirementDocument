import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'

export const metadata: Metadata = { title: 'Invoice History - TROO AI' }

const invoices = [
  { id: 'inv_001', date: 'Jun 1, 2026',  amount: '$29.00', plan: 'Pro',    status: 'paid' as const },
  { id: 'inv_002', date: 'May 1, 2026',  amount: '$29.00', plan: 'Pro',    status: 'paid' as const },
  { id: 'inv_003', date: 'Apr 1, 2026',  amount: '$29.00', plan: 'Pro',    status: 'paid' as const },
  { id: 'inv_004', date: 'Mar 1, 2026',  amount: '$0.00',  plan: 'Free',   status: 'paid' as const },
  { id: 'inv_005', date: 'Feb 15, 2026', amount: '$29.00', plan: 'Pro',    status: 'failed' as const },
]

const InvoicesPage = () => {
  return (
    <div className="space-y-5 sm:space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/billing">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" />Back</Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-foreground">Invoice History</h1>
          <p className="text-sm text-gray-400">All your billing transactions</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] text-sm">
            <thead>
              <tr className="border-b border-border text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Invoice</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-secondary transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{inv.id}</td>
                  <td className="px-4 py-3 text-gray-300">{inv.date}</td>
                  <td className="px-4 py-3 text-gray-400">{inv.plan}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{inv.amount}</td>
                  <td className="px-4 py-3">
                    <Badge variant={inv.status === 'paid' ? 'success' : 'danger'}>{inv.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button type="button" className="rounded-lg p-1.5 text-gray-400 hover:bg-secondary hover:text-foreground transition-colors" title="Download PDF">
                      <Download className="h-3.5 w-3.5" />
                    </button>
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

export default InvoicesPage;
