import { prisma } from '../config/db'
import { logger } from '../utils/logger'

export const creditService = {
  async deduct(userId: string, amount: number, reason: string): Promise<boolean> {
    const user = await prisma.trooUser.findUnique({ where: { id: userId } })
    if (!user || user.creditsRemaining < amount) return false

    const updated = await prisma.trooUser.update({
      where: { id: userId },
      data: { creditsRemaining: { decrement: amount }, creditsUsed: { increment: amount } },
    })

    await prisma.trooAuditLog.create({
      data: {
        userId,
        actor: user.email,
        actorRole: user.role,
        action: 'credits.deduct',
        entityId: userId,
        entityType: 'User',
        metadata: { amount, reason, remaining: updated.creditsRemaining },
      },
    })

    logger.debug(`Credits deducted: ${amount} from ${userId} for ${reason}`)
    return true
  },

  async refund(userId: string, amount: number, reason: string): Promise<void> {
    await prisma.trooUser.update({
      where: { id: userId },
      data: { creditsRemaining: { increment: amount }, creditsUsed: { decrement: amount } },
    })
    logger.debug(`Credits refunded: ${amount} to ${userId} for ${reason}`)
  },

  async reset(userId: string, amount: number): Promise<void> {
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await prisma.trooUser.update({
      where: { id: userId },
      data: { creditsRemaining: amount, creditsUsed: 0, creditsResetAt: nextMonth },
    })
  },
}
