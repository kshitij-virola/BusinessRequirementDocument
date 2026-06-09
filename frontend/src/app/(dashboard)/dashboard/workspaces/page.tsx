'use client'
import Link from 'next/link'
import { MessageSquare, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { useWorkspaces } from '@/lib/api/hooks'

const WorkspacesPage = () => {
  const { data, isLoading } = useWorkspaces()
  const workspaces = data?.workspaces ?? []

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Workspaces</h1>
          <p className="text-sm text-gray-400 mt-0.5">Your AI theme generation sessions</p>
        </div>
        <Link href="/dashboard/workspaces/new" className="self-start sm:self-auto">
          <Button><Plus className="h-4 w-4" />New Chat</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-secondary" />)}
        </div>
      ) : workspaces.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws) => (
            <Link key={ws._id} href={`/dashboard/workspaces/${ws._id}`}>
              <div className="rounded-xl border border-border bg-card p-4 hover:border-violet-500/50 hover:bg-secondary transition-all cursor-pointer space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare className="h-4 w-4 text-violet-400 shrink-0" />
                    <span className="font-medium text-foreground text-sm truncate">{ws.name}</span>
                  </div>
                  <Badge variant={ws.status === 'active' ? 'success' : 'muted'} className="shrink-0">{ws.status}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{ws.framework}</span>
                  <span>v{ws.currentVersion} &middot; {ws.totalGenerations} gen{ws.totalGenerations !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <MessageSquare className="h-10 w-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No workspaces yet</p>
          <p className="text-sm text-gray-600 mt-1">Start a new chat to generate your first theme</p>
        </div>
      )}
    </div>
  )
}

export default WorkspacesPage;
