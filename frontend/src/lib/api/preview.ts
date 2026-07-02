import { api } from './client'
import type { ApiResponse } from './types'

export type PreviewStatus = 'installing' | 'starting' | 'running' | 'error' | 'stopped'

export interface PreviewFile {
  path: string
  content: string
}

export interface PreviewStatusResponse {
  status: PreviewStatus
  port: number | null
  error: string | null
  logs: string[]
  previewUrl: string | null
}

export const previewApi = {
  async start(sessionId: string, framework: string, files: PreviewFile[]): Promise<void> {
    await api.post<ApiResponse<{ status: string }>>(`/preview/${sessionId}/start`, { framework, files })
  },

  async status(sessionId: string): Promise<PreviewStatusResponse> {
    const { data } = await api.get<ApiResponse<PreviewStatusResponse>>(`/preview/${sessionId}/status`)
    return data.data
  },

  async stop(sessionId: string): Promise<void> {
    await api.post<ApiResponse<{ status: string }>>(`/preview/${sessionId}/stop`)
  },
}
