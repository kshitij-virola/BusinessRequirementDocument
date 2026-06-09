import type { Metadata } from 'next'
import { verifyAdminSession } from '@/lib/dal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'

export const metadata: Metadata = { title: 'Moderation - TROO AI Admin' }

const blockedPrompts = [
  { id: '1', pattern: 'hack*',            reason: 'Security concern',     hits: 14, active: true  },
  { id: '2', pattern: 'adult content*',   reason: 'Inappropriate',        hits: 3,  active: true  },
  { id: '3', pattern: 'malware*',         reason: 'Security concern',     hits: 7,  active: true  },
  { id: '4', pattern: 'spam template',    reason: 'Abuse pattern',        hits: 0,  active: false },
]

const abuseReports = [
  { id: '1', user: 'user_abc123', prompt: 'Create a phishing page that looks like...', time: '2 hours ago', status: 'pending' as const },
  { id: '2', user: 'user_xyz789', prompt: 'Generate a script to bypass login',         time: '1 day ago',  status: 'resolved' as const },
]

const ModerationPage = async () => {
  await verifyAdminSession()
  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Content Moderation</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage blocked prompts, abuse detection, and spam filtering</p>
      </div>

      {/* Add blocked pattern */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Add Blocked Prompt Pattern</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input placeholder="Pattern (supports wildcards, e.g. hack*)" className="flex-1" />
          <Input placeholder="Reason" className="flex-1" />
          <Button className="shrink-0">Add Pattern</Button>
        </div>
      </div>

      {/* Blocked prompts table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Blocked Patterns ({blockedPrompts.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr className="border-b border-border text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Pattern</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Reason</th>
                <th className="px-4 py-3 text-left">Hits</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {blockedPrompts.map((p) => (
                <tr key={p.id} className="hover:bg-secondary transition-colors">
                  <td className="px-4 py-3 font-mono text-sm text-foreground">{p.pattern}</td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{p.reason}</td>
                  <td className="px-4 py-3 text-gray-400">{p.hits}</td>
                  <td className="px-4 py-3"><Badge variant={p.active ? 'success' : 'muted'}>{p.active ? 'Active' : 'Disabled'}</Badge></td>
                  <td className="px-4 py-3 flex gap-2">
                    <Button variant="ghost" size="sm">{p.active ? 'Disable' : 'Enable'}</Button>
                    <Button variant="danger" size="sm">Remove</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Abuse reports */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Abuse Reports</h2>
        </div>
        <div className="divide-y divide-border">
          {abuseReports.map((r) => (
            <div key={r.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm text-foreground truncate">{r.prompt}</p>
                <p className="text-xs text-gray-500 mt-0.5">{r.user} &middot; {r.time}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={r.status === 'pending' ? 'warning' : 'success'}>{r.status}</Badge>
                {r.status === 'pending' && <Button size="sm">Resolve</Button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ModerationPage;
