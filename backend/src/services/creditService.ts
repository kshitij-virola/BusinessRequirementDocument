import { User } from '../models/User'
import { AuditLog } from '../models/AuditLog'
import { logger } from '../utils/logger'

export const creditService = {
  async deduct(userId: string, amount: number, reason: string): Promise<boolean> {
    const user = await User.findById(userId)
    if (!user || user.credits.remaining < amount) return false

    user.credits.remaining -= amount
    user.credits.used += amount
    await user.save()

    await AuditLog.create({
      userId,
      actor: user.email,
      actorRole: user.role,
      action: 'credits.deduct',
      metadata: { amount, reason, remaining: user.credits.remaining },
    })

    logger.debug(`Credits deducted: ${amount} from ${userId} for ${reason}`)
    return true
  },

  async refund(userId: string, amount: number, reason: string): Promise<void> {
    await User.findByIdAndUpdate(userId, {
      $inc: { 'credits.remaining': amount, 'credits.used': -amount },
    })
    logger.debug(`Credits refunded: ${amount} to ${userId} for ${reason}`)
  },

  async reset(userId: string, amount: number): Promise<void> {
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    await User.findByIdAndUpdate(userId, {
      'credits.remaining': amount,
      'credits.used': 0,
      'credits.resetAt': nextMonth,
    })
  },
}
