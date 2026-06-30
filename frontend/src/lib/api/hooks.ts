'use client'
import useSWR, { mutate } from 'swr'
import { dashboardApi } from './dashboard'
import { workspacesApi } from './workspaces'
import { projectsApi } from './projects'
import { generationsApi } from './generations'
import { adminApi } from './admin'
import { authApi } from './auth'
import { billingApi } from './billing'
import { tokenStore } from './client'

// ── SWR keys ──────────────────────────────────────────────────────────────────

export const KEYS = {
  me:                '/auth/me',
  projects:          (q?: string) => `/projects${q ?? ''}`,
  project:           (id: string) => `/projects/${id}`,
  dashboardStats:    '/dashboard/stats',
  recentActivity:    '/dashboard/recent-activity',
  creditUsage:       (p: string) => `/dashboard/credit-usage?period=${p}`,
  workspaces:        (q?: string) => `/workspaces${q ?? ''}`,
  workspace:         (id: string) => `/workspaces/${id}`,
  workspaceVersions: (id: string) => `/workspaces/${id}/versions`,
  generation:        (id: string) => `/generations/${id}`,
  generations:       (q?: string) => `/generations${q ?? ''}`,
  adminStats:        '/admin/stats',
  adminUsers:        (q?: string) => `/admin/users${q ?? ''}`,
  plans:             '/billing/plans',
  adminPlans:        '/admin/plans',
  adminLogs:         (q?: string) => `/admin/logs${q ?? ''}`,
  adminAIConfig:     '/admin/ai-config',
  adminPlatformSettings: '/admin/settings',
  adminAccounts:     '/admin/admins',
}

// ── Auth ──────────────────────────────────────────────────────────────────────

const forceLogout = () => {
  tokenStore.clear()
  if (typeof window !== 'undefined') window.location.href = '/api/auth/clear-session'
}

export const useMe = () => {
  return useSWR(KEYS.me, authApi.getMe, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    onError: (error) => {
      const status = error?.response?.status ?? error?.status
      if (status === 401 || status === 403) forceLogout()
    },
  })
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const useDashboardStats = () => {
  return useSWR(KEYS.dashboardStats, dashboardApi.getStats)
}

export const useRecentActivity = () => {
  return useSWR(KEYS.recentActivity, dashboardApi.getRecentActivity)
}

export const useCreditUsage = (period: 'week' | 'month' = 'week') => {
  return useSWR(KEYS.creditUsage(period), () => dashboardApi.getCreditUsage(period))
}

// ── Projects ──────────────────────────────────────────────────────────────────

export const useProjects = (status?: string) => {
  const key = KEYS.projects(status ? `?status=${status}` : '')
  return useSWR(key, () => projectsApi.list({ status }))
}

export const useProject = (id: string) => {
  return useSWR(id ? KEYS.project(id) : null, () => projectsApi.get(id))
}

// ── Workspaces ────────────────────────────────────────────────────────────────

export const useWorkspaces = (params?: { status?: string; projectId?: string; generations?: boolean }) => {
  const filtered = params ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')) : {}
  const qs = Object.keys(filtered).length ? `?${new URLSearchParams(filtered as Record<string, string>).toString()}` : ''
  const key = KEYS.workspaces(qs)
  return useSWR(key, () => workspacesApi.list(params))
}

export const useWorkspace = (id: string) => {
  return useSWR(id ? KEYS.workspace(id) : null, () => workspacesApi.get(id))
}

export const useWorkspaceVersions = (id: string) => {
  return useSWR(id ? KEYS.workspaceVersions(id) : null, () => workspacesApi.getVersions(id))
}

// ── Generations ───────────────────────────────────────────────────────────────

export const useGeneration = (id: string) => {
  return useSWR(
    id ? KEYS.generation(id) : null,
    () => generationsApi.get(id),
    {
      refreshInterval: (gen) =>
        gen?.status === 'pending' || gen?.status === 'processing' ? 2_000 : 0,
    }
  )
}

export const useGenerations = (params?: { status?: string; framework?: string; page?: number }) => {
  const filtered = params ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')) : {}
  const qs = Object.keys(filtered).length ? `?${new URLSearchParams(filtered as Record<string, string>).toString()}` : ''
  return useSWR(KEYS.generations(qs), () => generationsApi.list(params))
}

// ── Billing ───────────────────────────────────────────────────────────────────

export const usePlans = () => {
  return useSWR(KEYS.plans, billingApi.getPlans, { revalidateOnFocus: false })
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export const useAdminStats = () => {
  return useSWR(KEYS.adminStats, adminApi.getStats)
}

export const useAdminUsers = (params?: {
  search?: string
  plan?: string
  status?: string
  page?: number
}) => {
  const qs = params
    ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
    : ''
  return useSWR(KEYS.adminUsers(qs), () => adminApi.listUsers(params))
}

export const useAdminPlans = () => {
  return useSWR(KEYS.adminPlans, adminApi.listPlans)
}

export const useAdminLogs = (params?: { action?: string; actionPrefix?: string; actor?: string; page?: number }) => {
  const filtered = params ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '')) : {}
  const qs = Object.keys(filtered).length ? `?${new URLSearchParams(filtered as Record<string, string>).toString()}` : ''
  return useSWR(KEYS.adminLogs(qs), () => adminApi.listLogs(params))
}

export const useAIConfig = () => {
  return useSWR(KEYS.adminAIConfig, adminApi.getAIConfig)
}

export const usePlatformSettings = () => {
  return useSWR(KEYS.adminPlatformSettings, adminApi.getPlatformSettings)
}

export const useAdminAccounts = () => {
  return useSWR(KEYS.adminAccounts, adminApi.listAdmins)
}

// ── Cache invalidation helpers ────────────────────────────────────────────────

export const invalidateProjects = async () => {
  await mutate((key: unknown) => typeof key === 'string' && key.startsWith('/projects'))
}

export const invalidateWorkspaces = async () => {
  await mutate((key: unknown) => typeof key === 'string' && key.startsWith('/workspaces'))
}

export const invalidateDashboard = async () => {
  await Promise.all([
    mutate(KEYS.dashboardStats),
    mutate(KEYS.recentActivity),
  ])
}
