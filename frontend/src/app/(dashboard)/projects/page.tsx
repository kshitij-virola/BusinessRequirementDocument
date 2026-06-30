'use client'
import Link from 'next/link'
import { FolderOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { formatDate } from '@/lib/utils'
import { useProjects } from '@/lib/api/hooks'

const ProjectsPage = () => {
  const { data, isLoading } = useProjects()
  const projects = data?.projects ?? []

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-sm text-gray-400 mt-0.5">Organise your workspaces into projects</p>
        </div>
        <Link href="/projects/new" className="self-start sm:self-auto">
          <Button><Plus className="h-4 w-4" />New Project</Button>
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-sm">
            <thead>
              <tr className="border-b border-border text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium">Project</th>
                <th className="px-4 py-3 text-left font-medium">Workspaces</th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Created</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="px-4 py-3">
                      <div className="h-6 rounded bg-secondary animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : projects.map((project) => (
                <tr key={project._id} className="hover:bg-secondary transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/projects/${project._id}`} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-medium text-foreground hover:text-primary transition-colors">{project.name}</span>
                      </div>
                      {project.description && (
                        <span className="text-xs text-gray-500 line-clamp-1 pl-6">{project.description}</span>
                      )}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{project.workspaceCount}</td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{formatDate(project.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={project.status === 'active' ? 'success' : 'muted'}>{project.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && projects.length === 0 && (
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
