import { api } from './client'
import type { ApiResponse, AdminUser, AdminStats, AuditLogEntry, Plan, AIConfig, PlatformSettings } from './types'

interface UserListParams { page?: number; limit?: number; search?: string; plan?: string; status?: string }
interface LogListParams  { page?: number; limit?: number; action?: string; userId?: string }

export const adminApi = {
  // ── Stats ─────────────────────────────────────────────────────────────────
  async getStats(): Promise<AdminStats> {
    const { data } = await api.get<ApiResponse<AdminStats>>('/admin/stats')
    return data.data
  },

  // ── Users ─────────────────────────────────────────────────────────────────
  async listUsers(params: UserListParams = {}): Promise<{ users: AdminUser[]; total: number }> {
    const { data } = await api.get<ApiResponse<{ users: AdminUser[]; total: number }>>('/admin/users', { params })
    return data.data
  },

  async suspendUser(id: string): Promise<void> {
    await api.patch(`/admin/users/${id}/suspend`)
  },

  async activateUser(id: string): Promise<void> {
    await api.patch(`/admin/users/${id}/activate`)
  },

  async resetCredits(id: string): Promise<void> {
    await api.patch(`/admin/users/${id}/reset-credits`)
  },

  // ── Plans ─────────────────────────────────────────────────────────────────
  async listPlans(): Promise<Plan[]> {
    const { data } = await api.get<ApiResponse<Plan[]>>('/admin/plans')
    return data.data
  },

  async updatePlan(id: string, body: Partial<Plan>): Promise<Plan> {
    const { data } = await api.patch<ApiResponse<Plan>>(`/admin/plans/${id}`, body)
    return data.data
  },

  // ── Audit logs ────────────────────────────────────────────────────────────
  async listLogs(params: LogListParams = {}): Promise<{ logs: AuditLogEntry[]; total: number }> {
    const { data } = await api.get<ApiResponse<{ logs: AuditLogEntry[]; total: number }>>('/admin/logs', { params })
    return data.data
  },

  // ── User role ─────────────────────────────────────────────────────────────
  async changeUserRole(id: string, role: 'user' | 'admin'): Promise<void> {
    await api.patch(`/admin/users/${id}/role`, { role })
  },

  // ── AI config ─────────────────────────────────────────────────────────────
  async getAIConfig(): Promise<AIConfig> {
    const { data } = await api.get<ApiResponse<AIConfig>>('/admin/ai-config')
    return data.data
  },

  async saveAIConfig(updates: Partial<AIConfig>): Promise<void> {
    await api.put('/admin/ai-config', updates)
  },

  // ── Platform settings ─────────────────────────────────────────────────────
  async getPlatformSettings(): Promise<PlatformSettings> {
    const { data } = await api.get<ApiResponse<PlatformSettings>>('/admin/settings')
    return data.data
  },

  async savePlatformSettings(updates: Partial<PlatformSettings>): Promise<void> {
    await api.put('/admin/settings', updates)
  },
}
