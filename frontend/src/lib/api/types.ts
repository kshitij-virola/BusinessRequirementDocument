// ── Generic API response wrapper ──────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  accessToken: string
  user: {
    id: string
    name: string
    email: string
    role: string
    subscription: { plan: string; status: string }
  }
}

export interface MeResponse {
  _id: string
  name: string
  email: string
  role: string
  isEmailVerified: boolean
  isSuspended: boolean
  subscription: {
    plan: 'free' | 'pro' | 'agency'
    status: string
    stripeCustomerId?: string
    currentPeriodEnd?: string
  }
  credits:  { remaining: number; used: number; resetAt: string }
  storage:  { usedBytes: number; limitBytes: number }
  createdAt: string
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalProjects:    number
  activeProjects:   number
  totalGenerations: number
  downloads:        number
  creditsRemaining: number
  creditsUsed:      number
  subscriptionPlan: string
  subscriptionStatus: string
  storageUsedBytes: number
  storageLimitBytes: number
}

export interface RecentGeneration {
  _id:          string
  prompt:       string
  framework:    string
  status:       'pending' | 'processing' | 'completed' | 'failed'
  createdAt:    string
  creditsUsed:  number
  workspaceId?: { _id: string; name: string; framework: string }
}

export interface CreditUsagePoint {
  _id:     string // date string "YYYY-MM-DD" or week "W1"
  credits: number
  count:   number
}

// ── Workspaces ────────────────────────────────────────────────────────────────

export interface Workspace {
  _id:              string
  name:             string
  framework:        string
  status:           'active' | 'archived' | 'deleted'
  description?:     string
  currentVersion:   number
  totalGenerations: number
  createdAt:        string
  updatedAt:        string
}

export interface WorkspaceVersion {
  _id:        string
  version:    number
  prompt:     string
  framework:  string
  createdAt:  string
  creditsUsed: number
  status:     string
}

// ── Generations ───────────────────────────────────────────────────────────────

export interface Generation {
  _id:             string
  workspaceId:     string
  version:         number
  prompt:          string
  framework:       string
  inputMode:       'text' | 'figma' | 'image'
  status:          'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  outputCode?:     string
  outputFiles?:    { path: string; content: string }[]
  zipUrl?:         string
  tokensUsed:      number
  creditsUsed:     number
  aiProvider:      string
  aiModel:         string
  errorMessage?:   string
  processingTimeMs?: number
  createdAt:       string
}

// ── Admin config ──────────────────────────────────────────────────────────

export interface AIProvider {
  id: string
  name: string
  model: string
  status: 'active' | 'standby' | 'disabled'
  costPer1kTokens: number
}

export interface AIRateLimits {
  maxTokensPerRequest: number
  dailySpendLimitUsd: number
  maxConcurrentRequests: number
  timeoutSeconds: number
}

export interface AICreditCosts {
  textGeneration: number
  imageConversion: number
  figmaConversion: number
  themeExport: number
}

export interface AIConfig {
  'ai.activeProvider': string
  'ai.providers': AIProvider[]
  'ai.systemPrompt': string
  'ai.rateLimits': AIRateLimits
  'credits.costs': AICreditCosts
  'moderation.blockedPatterns': string[]
}

export interface PlatformSettings {
  'platform.name': string
  'platform.supportEmail': string
  'platform.yearlyDiscount': number
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface AdminUser {
  _id:         string
  name:        string
  email:       string
  role:        string
  isSuspended: boolean
  subscription: { plan: string; status: string }
  credits:     { remaining: number; used: number }
  storage:     { usedBytes: number; limitBytes: number }
  createdAt:   string
}

export interface AdminStats {
  totalUsers:       number
  activeUsers:      number
  newRegistrations: number
  mrr:              number
  arr:              number
  aiRequests:       number
  aiCostUsd:        number
  totalTokens:      number
  conversionRate:   string
}

export interface AuditLogEntry {
  _id:        string
  actor:      string
  actorRole:  string
  action:     string
  entityId?:  string
  entityType?: string
  metadata?:  Record<string, unknown>
  createdAt:  string
  userId?:    { _id: string; name: string; email: string }
}

export interface PlanFeatures {
  projects:            number
  generationsPerMonth: number
  storageBytes:        number
  downloadsPerMonth:   number | null
  frameworks:          string[]
  figmaConversion:     boolean
  imageConversion:     boolean
  teamMembers:         number
  apiAccess:           boolean
  priorityQueue:       boolean
}

export interface Plan {
  _id:                   string
  name:                  string
  slug:                  string // 'free' | 'pro' | 'agency'
  monthlyPrice:          number
  yearlyPrice:           number
  features:              PlanFeatures
  creditCosts:           Record<string, number>
  isActive:              boolean
  isPopular:             boolean
  stripePriceIdMonthly?: string
  stripePriceIdYearly?:  string
}

// ── Billing ───────────────────────────────────────────────────────────────────

export interface CheckoutResponse {
  url: string
}

// ── Paginated wrapper ─────────────────────────────────────────────────────────

export interface Paginated<T> {
  data:  T[]
  total: number
  page:  number
  limit: number
}
