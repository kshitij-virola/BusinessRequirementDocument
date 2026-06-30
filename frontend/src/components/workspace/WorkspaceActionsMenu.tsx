'use client'
import { useState, useRef, useEffect, useTransition } from 'react'
import { MoreVertical, Pencil, Archive, Trash2, Share2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import { workspacesApi } from '@/lib/api/workspaces'
import { invalidateWorkspaces } from '@/lib/api/hooks'
import { useRouter } from 'next/navigation'

interface WorkspaceActionsMenuProps {
  workspaceId: string
  name: string
  status: 'active' | 'archived'
}

export const WorkspaceActionsMenu = ({ workspaceId, name, status }: WorkspaceActionsMenuProps) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [newName, setNewName] = useState(name)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleArchive = () => {
    setOpen(false)
    startTransition(async () => {
      try {
        await workspacesApi.update(workspaceId, { status: status === 'active' ? 'archived' : 'active' })
        await invalidateWorkspaces()
      } catch {
        setError('Failed to update workspace status.')
      }
    })
  }

  const handleRename = () => {
    startTransition(async () => {
      try {
        await workspacesApi.update(workspaceId, { name: newName.trim() })
        await invalidateWorkspaces()
        setRenameOpen(false)
      } catch {
        setError('Failed to rename workspace.')
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await workspacesApi.remove(workspaceId)
        await invalidateWorkspaces()
        setDeleteOpen(false)
        router.push('/workspaces')
      } catch {
        setError('Failed to delete workspace.')
      }
    })
  }

  const actions = [
    { label: 'Rename',   icon: Pencil,  onClick: () => { setRenameOpen(true); setOpen(false) } },
    { label: status === 'active' ? 'Archive' : 'Unarchive', icon: Archive, onClick: handleArchive },
    { label: 'Share (coming soon)', icon: Share2, onClick: () => setOpen(false), disabled: true },
    { label: 'Delete',   icon: Trash2,  onClick: () => { setDeleteOpen(true); setOpen(false) }, danger: true },
  ]

  return (
    <>
      <div ref={ref} className="relative">
        <button type="button" onClick={() => setOpen((o) => !o)}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-secondary hover:text-foreground transition-colors">
          <MoreVertical className="h-4 w-4" />
        </button>
        {open && (
          <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-border bg-card shadow-2xl z-50 overflow-hidden">
            <div className="p-1">
              {actions.map((a) => (
                <button key={a.label} type="button" disabled={a.disabled} onClick={a.onClick}
                  className={cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                    a.disabled ? 'text-gray-600 cursor-not-allowed' :
                    (a.danger) ? 'text-red-400 hover:bg-red-500/10' : 'text-gray-300 hover:bg-secondary hover:text-foreground'
                  )}>
                  <a.icon className="h-4 w-4" />{a.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}

      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title="Rename Workspace" size="sm">
        <div className="space-y-4">
          <Input label="Workspace name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <div className="flex gap-2">
            <Button fullWidth loading={isPending} onClick={handleRename} disabled={!newName.trim()}>Save</Button>
            <Button variant="ghost" fullWidth onClick={() => setRenameOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete Workspace" description="This action cannot be undone." size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Are you sure you want to delete <span className="font-medium text-foreground">{name}</span>?
          </p>
          <div className="flex gap-2">
            <Button variant="danger" fullWidth loading={isPending} onClick={handleDelete}>Delete</Button>
            <Button variant="ghost" fullWidth onClick={() => setDeleteOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
