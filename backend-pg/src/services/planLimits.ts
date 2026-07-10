import { EventEmitter } from 'events'
import { prisma } from '../config/db'

export type SubscriptionPlan = 'free' | 'pro' | 'agency'

interface PlanLimit {
  credits: number
  storageBytes: number
}

export const STATIC_PLAN_LIMITS: Record<SubscriptionPlan, PlanLimit> = {
  free:   { credits: 25,   storageBytes: 500 * 1024 * 1024 },
  pro:    { credits: 500,  storageBytes: 10  * 1024 * 1024 * 1024 },
  agency: { credits: 5000, storageBytes: 100 * 1024 * 1024 * 1024 },
}

const planEvents = new EventEmitter()
let cache: Record<SubscriptionPlan, PlanLimit> | null = null

const load = async (): Promise<void> => {
  const plans = await prisma.trooPlan.findMany({ where: { isActive: true } })
  const next = { ...STATIC_PLAN_LIMITS }
  for (const plan of plans) {
    const slug = plan.slug as SubscriptionPlan
    if (next[slug]) {
      next[slug] = {
        credits: plan.featuresGenerationsPerMonth ?? STATIC_PLAN_LIMITS[slug].credits,
        storageBytes: Number(plan.featuresStorageBytes ?? STATIC_PLAN_LIMITS[slug].storageBytes),
      }
    }
  }
  cache = next
}

planEvents.on('plan_changed', () => {
  load().catch(() => {})
})

export const invalidatePlanLimits = (): void => {
  planEvents.emit('plan_changed')
}

export const getPlanLimits = async (): Promise<Record<SubscriptionPlan, PlanLimit>> => {
  if (!cache) await load().catch(() => {})
  return cache ?? STATIC_PLAN_LIMITS
}
