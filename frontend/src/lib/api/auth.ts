import { api, tokenStore } from './client'
import type { ApiResponse, LoginResponse, MeResponse } from './types'

export const authApi = {
  async register(name: string, email: string, password: string) {
    const { data } = await api.post<ApiResponse<{ message: string }>>('/auth/register', { name, email, password })
    return data
  },

  async login(email: string, password: string): Promise<LoginResponse> {
    const { data } = await api.post<ApiResponse<LoginResponse>>('/auth/login', { email, password })
    tokenStore.set(data.data.accessToken)
    return data.data
  },

  async logout() {
    await api.post('/auth/logout').catch(() => {})
    tokenStore.clear()
  },

  async deactivateAccount() {
    const { data } = await api.post<ApiResponse<null>>('/auth/deactivate')
    tokenStore.clear()
    return data
  },

  async forgotPassword(email: string) {
    const { data } = await api.post<ApiResponse<null>>('/auth/forgot-password', { email })
    return data
  },

  async resetPassword(token: string, password: string) {
    const { data } = await api.post<ApiResponse<null>>('/auth/reset-password', { token, password })
    return data
  },

  async getMe(): Promise<MeResponse> {
    const { data } = await api.get<ApiResponse<MeResponse>>('/auth/me')
    return data.data
  },

  async updateProfile(name: string, email: string): Promise<MeResponse> {
    const { data } = await api.patch<ApiResponse<MeResponse>>('/auth/profile', { name, email })
    return data.data
  },

  async updatePassword(currentPassword: string, newPassword: string) {
    const { data } = await api.patch<ApiResponse<null>>('/auth/password', { currentPassword, newPassword })
    return data
  },

  async verifyEmail(token: string) {
    const { data } = await api.get<ApiResponse<null>>(`/auth/verify-email?token=${token}`)
    return data
  },
}
