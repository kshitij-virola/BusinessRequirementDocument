'use client'
import { useState } from 'react'
import { History, GitBranch, Download } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { useWorkspaceVersions } from '@/lib/api/hooks'

interface VersionHistoryButtonProps {
  workspaceId: string
}

export const VersionHistoryButton = ({ workspaceId }: VersionHistoryButtonProps) => {
  const [open, setOpen] = useState(false)
  const { data: versions, isLoading } = useWorkspaceVersions(open ? workspaceId : '')

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Version history"
        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-gray-400 hover:bg-secondary hover:text-foreground transition-colors">
        <History className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">History</span>
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Version History" description="All generations for this workspace" size="md">
        <div className="space-y-2 max-h-80 overflow-y-auto -mx-1 px-1">
          {isLoading ? (
            <div className="space-y-2 animate-pulse">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-secondary" />)}
            </div>
          ) : !versions?.length ? (
            <p className="text-sm text-gray-500 text-center py-6">No versions yet.</p>
          ) : (
            versions.map((v, idx) => (
              <div key={v._id} className="rounded-xl border border-border bg-background p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-violet-400 shrink-0" />
                    <span className="text-sm font-medium text-foreground">Version {v.version}</span>
                    {idx === 0 && <Badge variant="success">Current</Badge>}
                  </div>
                  <button type="button" title="Download" className="rounded-lg p-1.5 text-gray-400 hover:bg-secondary hover:text-foreground transition-colors">
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-sm text-gray-400 line-clamp-2">{v.prompt}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{formatDate(v.createdAt)}</span>
                  <span>&middot;</span>
                  <span>{v.creditsUsed} credit used</span>
                  <Badge variant={v.status === 'completed' ? 'success' : v.status === 'failed' ? 'danger' : 'muted'} className="ml-auto">{v.status}</Badge>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="pt-3 border-t border-border mt-4">
          <Button variant="ghost" fullWidth onClick={() => setOpen(false)}>Close</Button>
        </div>
      </Modal>
    </>
  )
}
