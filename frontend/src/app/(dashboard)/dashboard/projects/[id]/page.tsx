import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, FolderOpen, MessageSquare, Plus, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = { title: 'Project - TROO AI' }

const mockProject = {
  id: '1',
  name: 'SaaS Startup Kit',
  framework: 'React',
  description: 'A collection of SaaS-themed UI components and pages.',
  createdAt: '2024-01-10',
  workspaces: [
    { id: 'ws-1', name: 'Dashboard Theme', updatedAt: '2 hours ago', status: 'completed' as const, generations: 3 },
    { id: 'ws-2', name: 'Landing Page', updatedAt: '1 day ago', status: 'completed' as const, generations: 2 },
    { id: 'ws-3', name: 'Auth Screens', updatedAt: '3 days ago', status: 'in-progress' as const, generations: 1 },
  ],
}

const statusVariant: Record<string, 'success' | 'warning' | 'muted'> = {
  completed: 'success',
  'in-progress': 'warning',
  archived: 'muted',
}

const ProjectDetailPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  const project = { ...mockProject, id }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/projects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Projects
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-violet-400" />
            <div>
              <h1 className="text-xl font-bold text-foreground">{project.name}</h1>
              <p className="text-xs text-gray-500">{project.framework} &middot; Created {formatDate(project.createdAt)}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/workspaces/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New Workspace
            </Button>
          </Link>
          <button type="button" className="rounded-lg p-2 text-gray-400 hover:bg-secondary hover:text-foreground transition-colors">
            <MoreVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      {project.description && (
        <p className="text-sm text-gray-400 max-w-xl">{project.description}</p>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-300 mb-3">
          Workspaces ({project.workspaces.length})
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {project.workspaces.map((ws) => (
            <Link key={ws.id} href={`/dashboard/workspaces/${ws.id}`}>
              <div className="rounded-xl border border-border bg-card p-4 hover:border-violet-500/50 hover:bg-secondary transition-all cursor-pointer space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-violet-400 shrink-0" />
                    <span className="font-medium text-foreground text-sm">{ws.name}</span>
                  </div>
                  <Badge variant={statusVariant[ws.status] ?? 'muted'}>{ws.status}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{ws.generations} generation{ws.generations !== 1 ? 's' : ''}</span>
                  <span>{ws.updatedAt}</span>
                </div>
              </div>
            </Link>
          ))}

          <Link href="/dashboard/workspaces/new">
            <div className="rounded-xl border border-dashed border-border p-4 hover:border-violet-500/40 hover:bg-secondary transition-all cursor-pointer flex items-center justify-center gap-2 text-gray-500 hover:text-violet-400 min-h-[90px]">
              <Plus className="h-4 w-4" />
              <span className="text-sm">Add Workspace</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ProjectDetailPage;
