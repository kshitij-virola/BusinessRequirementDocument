'use client'
import Link from 'next/link'
import { FolderOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { useWorkspaces } from '@/lib/api/hooks'

const ProjectsPage = () => {
  // Workspaces are the project-level entities in the BRD model
  const { data, isLoading } = useWorkspaces()
  const workspaces = data?.workspaces ?? []

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-gray-400 mt-0.5">Organise your workspaces into projects</p>
        </div>
        <Link href="/dashboard/projects/new" className="self-start sm:self-auto">
          <Button><Plus className="h-4 w-4" />New Project</Button>
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-border text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium">Project</th>
                <th className="px-4 py-3 text-left font-medium">Framework</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Generations</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Created</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-4 py-3">
                      <div className="h-6 rounded bg-secondary animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : workspaces.map((ws) => (
                <tr key={ws._id} className="hover:bg-secondary transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/projects/${ws._id}`} className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-violet-400 shrink-0" />
                      <span className="font-medium text-foreground hover:text-violet-300 transition-colors">{ws.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{ws.framework}</td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{ws.totalGenerations}</td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{formatDate(ws.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={ws.status === 'active' ? 'success' : 'muted'}>{ws.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && workspaces.length === 0 && (
          <div className="py-12 text-center">
            <FolderOpen className="h-10 w-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No projects yet</p>
            <p className="text-sm text-gray-600 mt-1">Create a project to organise your workspaces</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectsPage;
