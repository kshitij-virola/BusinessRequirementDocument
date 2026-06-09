import { api } from './client'
import type { ApiResponse, Generation } from './types'

interface GenerateParams {
  workspaceId: string
  prompt:      string
  framework:   string
  inputMode:   'text' | 'figma' | 'image'
  figmaUrl?:   string
  images?:     File[]
  imageKey?:   string
  imageKeys?:  string[]
}

interface ListParams { page?: number; limit?: number; status?: string; framework?: string }

export const generationsApi = {
  async uploadImage(file: File): Promise<{ key: string; url: string }> {
    const formData = new FormData()
    formData.append('image', file)
    const { data } = await api.post<ApiResponse<{ key: string; url: string }>>('/generations/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.data
  },

  async uploadImages(files: File[]): Promise<{ key: string; url: string }[]> {
    const formData = new FormData()
    files.forEach((file) => formData.append('images', file))
    const { data } = await api.post<ApiResponse<{ uploads: { key: string; url: string }[] }>>(
      '/generations/upload-images',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return data.data.uploads
  },

  async generate(params: GenerateParams): Promise<{ generationId: string; status: string }> {
    let imageKey = params.imageKey
    let imageKeys = params.imageKeys

    if (params.images && params.images.length > 0) {
      if (params.inputMode === 'image') {
        // Single image mode — upload one file, send imageKey
        const uploadRes = await this.uploadImage(params.images[0])
        imageKey = uploadRes.key
      } else {
        // Text mode with attachments — upload all in parallel, send imageKeys[]
        const uploads = await this.uploadImages(params.images)
        imageKeys = uploads.map((u) => u.key)
      }
    }

    const { images, ...payload } = params
    const { data } = await api.post<ApiResponse<{ generationId: string; status: string }>>('/generations', {
      ...payload,
      imageKey,
      imageKeys,
    })
    return data.data
  },

  async get(id: string): Promise<Generation> {
    const { data } = await api.get<ApiResponse<Generation>>(`/generations/${id}`)
    return data.data
  },

  async getDownloadUrl(id: string): Promise<string> {
    const { data } = await api.get<ApiResponse<{ url: string }>>(`/generations/${id}/download`)
    return data.data.url
  },

  async list(params: ListParams = {}): Promise<{ generations: Generation[]; total: number }> {
    const { data } = await api.get<ApiResponse<{ generations: Generation[]; total: number }>>('/generations', { params })
    return data.data
  },
}
