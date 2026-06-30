import { api } from './client'
import type { ApiResponse, Project } from './types'

interface ListParams { status?: string; page?: number; limit?: number }
interface CreateParams { name: string; description?: string }
interface UpdateParams { name?: string; description?: string; status?: 'active' | 'archived' }

export const projectsApi = {
  async list(params: ListParams = {}): Promise<{ projects: Project[]; total: number }> {
    const { data } = await api.get<ApiResponse<{ projects: Project[]; total: number }>>('/projects', { params })
    return data.data
  },

  async get(id: string): Promise<Project> {
    const { data } = await api.get<ApiResponse<Project>>(`/projects/${id}`)
    return data.data
  },

  async create(params: CreateParams): Promise<Project> {
    const { data } = await api.post<ApiResponse<Project>>('/projects', params)
    return data.data
  },

  async update(id: string, params: UpdateParams): Promise<Project> {
    const { data } = await api.patch<ApiResponse<Project>>(`/projects/${id}`, params)
    return data.data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/projects/${id}`)
  },
}
