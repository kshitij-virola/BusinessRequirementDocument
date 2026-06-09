import { api } from './client'
import type { ApiResponse, DashboardStats, RecentGeneration, CreditUsagePoint } from './types'

export const dashboardApi = {
  async getStats(): Promise<DashboardStats> {
    const { data } = await api.get<ApiResponse<DashboardStats>>('/dashboard/stats')
    return data.data
  },

  async getRecentActivity(): Promise<RecentGeneration[]> {
    const { data } = await api.get<ApiResponse<RecentGeneration[]>>('/dashboard/recent-activity')
    return data.data
  },

  async getCreditUsage(period: 'week' | 'month' = 'week'): Promise<CreditUsagePoint[]> {
    const { data } = await api.get<ApiResponse<CreditUsagePoint[]>>(`/dashboard/credit-usage?period=${period}`)
    return data.data
  },
}
