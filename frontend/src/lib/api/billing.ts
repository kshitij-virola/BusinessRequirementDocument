import { api } from './client'
import type { ApiResponse, CheckoutResponse, Plan } from './types'

export const billingApi = {
  async getPlans(): Promise<Plan[]> {
    const { data } = await api.get<ApiResponse<Plan[]>>('/billing/plans')
    return data.data
  },

  async createCheckout(priceId: string, billing: 'monthly' | 'yearly' = 'monthly'): Promise<string> {
    const { data } = await api.post<ApiResponse<CheckoutResponse>>('/billing/checkout', { priceId, billing })
    return data.data.url
  },

  async openPortal(): Promise<string> {
    const { data } = await api.post<ApiResponse<{ url: string }>>('/billing/portal')
    return data.data.url
  },
}
