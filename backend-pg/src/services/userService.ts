import { prisma } from '../config/db'
import { STATIC_PLAN_LIMITS } from './planLimits'

/** Downgrades an expired/inactive paid subscription back to free, mirroring the old checkSubscription() document method. */
export const checkSubscription = async (userId: string): Promise<void> => {
  const user = await prisma.trooUser.findUnique({ where: { id: userId } })
  if (!user || user.subscriptionPlan === 'free') return

  const now = new Date()
  const hasExpired = user.currentPeriodEnd !== null && user.currentPeriodEnd < now
  const isInactive = !['active', 'trialing'].includes(user.subscriptionStatus)

  if (hasExpired || isInactive) {
    await prisma.trooUser.update({
      where: { id: userId },
      data: {
        subscriptionPlan: 'free',
        subscriptionStatus: 'canceled',
        storageLimitBytes: STATIC_PLAN_LIMITS.free.storageBytes,
      },
    })
  }
}
