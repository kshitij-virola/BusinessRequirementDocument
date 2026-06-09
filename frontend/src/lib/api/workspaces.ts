import { api } from './client'
import type { ApiResponse, Workspace, WorkspaceVersion } from './types'

interface ListParams { status?: string; page?: number; limit?: number }
interface CreateParams { name: string; framework: string; description?: string }
interface UpdateParams { name?: string; status?: 'active' | 'archived' }

export const workspacesApi = {
  async list(params: ListParams = {}): Promise<{ workspaces: Workspace[]; total: number }> {
    const { data } = await api.get<ApiResponse<{ workspaces: Workspace[]; total: number }>>('/workspaces', { params })
    return data.data
  },

  async get(id: string): Promise<Workspace> {
    const { data } = await api.get<ApiResponse<Workspace>>(`/workspaces/${id}`)
    return data.data
  },

  async create(params: CreateParams): Promise<Workspace> {
    const { data } = await api.post<ApiResponse<Workspace>>('/workspaces', params)
    return data.data
  },

  async update(id: string, params: UpdateParams): Promise<Workspace> {
    const { data } = await api.patch<ApiResponse<Workspace>>(`/workspaces/${id}`, params)
    return data.data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/workspaces/${id}`)
  },

  async getVersions(id: string): Promise<WorkspaceVersion[]> {
    const { data } = await api.get<ApiResponse<WorkspaceVersion[]>>(`/workspaces/${id}/versions`)
    return data.data
  },
}
