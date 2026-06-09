export type UserRole = 'visitor' | 'user' | 'admin' | 'superadmin'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  subscriptionPlan?: 'free' | 'pro' | 'agency'
  creditsRemaining?: number
}

export interface SessionPayload {
  userId: string
  role: UserRole
  expiresAt: Date
}

export type FormState =
  | {
      errors?: {
        name?: string[]
        email?: string[]
        password?: string[]
        confirmPassword?: string[]
      }
      message?: string
      success?: boolean
      redirectTo?: string
    }
  | undefined

export interface DashboardStats {
  totalProjects: number
  activeProjects: number
  totalGenerations: number
  creditsRemaining: number
  downloads: number
  subscriptionStatus: string
}

export interface Project {
  id: string
  name: string
  framework: string
  createdAt: string
  updatedAt: string
  status: 'active' | 'archived'
}

export interface Generation {
  id: string
  prompt: string
  framework: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  createdAt: string
  creditsUsed: number
}
