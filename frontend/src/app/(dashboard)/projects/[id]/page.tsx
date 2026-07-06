'use client'
import { use } from 'react'
import Link from 'next/link'
import { ArrowLeft, FolderOpen, MessageSquare, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { formatDate, formatDateTime, truncateText } from '@/lib/utils'
import { useProject, useWorkspaces } from '@/lib/api/hooks'
import { ProjectActionsMenu } from '@/components/project/ProjectActionsMenu'

const statusVariant: Record<string, 'success' | 'warning' | 'muted'> = {
  active: 'success',
  completed: 'success',
  'in-progress': 'warning',
  archived: 'muted',
}

const ProjectDetailPage = ({ params: paramsPromise }: { params: Promise<{ id: string }> }) => {
  const params = use(paramsPromise)
  const { id } = params

  const { data: project, isLoading: projectLoading } = useProject(id)
  const { data: workspacesData, isLoading: workspacesLoading } = useWorkspaces({ projectId: id, generations: true })

  const workspaces = workspacesData?.workspaces ?? []

  if (projectLoading || workspacesLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-24 bg-secondary rounded" />
        <div className="h-16 bg-secondary rounded-xl" />
        <div className="h-6 w-32 bg-secondary rounded" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-secondary rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (!project || project.status === 'deleted') {
    return (
      <div className="text-center py-12">
        <FolderOpen className="h-10 w-10 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 font-medium">Project not found</p>
        <Link href="/projects" className="mt-4 inline-block">
          <Button variant="ghost"><ArrowLeft className="h-4 w-4 mr-1" />Back to Projects</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/projects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Projects
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary shrink-0" />
            <div>
              <h1 className="text-xl font-bold text-foreground">{project.name}</h1>
              <p className="text-xs text-gray-500">Created {formatDate(project.createdAt)}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/workspaces/chat?projectId=${project._id}`}>
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New Workspace
            </Button>
          </Link>
          <ProjectActionsMenu projectId={project._id} name={project.name} status={project.status === 'archived' ? 'archived' : 'active'} />
        </div>
      </div>

      {project.description && (
        <p className="text-sm text-gray-400 max-w-xl">{project.description}</p>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-300 mb-3">
          Workspaces ({workspaces.length})
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((ws: any) => (
            <Link key={ws._id} href={ws?.generations?.[0]?.threadId ? `/thread/${ws.generations[0].threadId}` : '/workspaces/chat'}>
              <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:bg-secondary transition-all cursor-pointer space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium text-foreground text-sm truncate">{truncateText(ws.name, 40)}</span>
                  </div>
                  <Badge variant={statusVariant[ws.status] ?? 'muted'}>{ws.status}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{ws.framework}</span>
                  <span>v{ws.currentVersion} &middot; {ws.totalGenerations} gen{ws.totalGenerations !== 1 ? 's' : ''}</span>
                  <div className="text-[11px] text-gray-500">{formatDateTime(ws.createdAt)}</div>
                </div>
              </div>
            </Link>
          ))}

          <Link href={`/workspaces/chat?projectId=${project._id}`}>
            <div className="rounded-xl border border-dashed border-border p-4 hover:border-primary/40 hover:bg-secondary transition-all cursor-pointer flex items-center justify-center gap-2 text-gray-500 hover:text-primary min-h-[90px]">
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
