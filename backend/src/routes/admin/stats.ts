import { Router, Response } from 'express'
import { User } from '../../models/User'
import { Generation } from '../../models/Generation'
import { authenticate, AuthRequest } from '../../middleware/auth'
import { requireAdmin } from '../../middleware/rbac'
import { success } from '../../utils/apiResponse'

const router = Router()
router.use(authenticate, requireAdmin)

// GET /api/admin/stats — KPIs
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [totalUsers, activeUsers, newUsers, proUsers, agencyUsers, totalGenerations, aiCostAgg] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isSuspended: false }),
    User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
    User.countDocuments({ 'subscription.plan': 'pro' }),
    User.countDocuments({ 'subscription.plan': 'agency' }),
    Generation.countDocuments(),
    Generation.aggregate([{ $group: { _id: null, totalCost: { $sum: '$aiCostUsd' }, totalTokens: { $sum: '$tokensUsed' } } }]),
  ])

  const mrr = (proUsers * 29) + (agencyUsers * 99)
  const aiCost = aiCostAgg[0] ?? { totalCost: 0, totalTokens: 0 }

  success(res, {
    totalUsers,
    activeUsers,
    newRegistrations: newUsers,
    mrr,
    arr: mrr * 12,
    aiRequests: totalGenerations,
    aiCostUsd: aiCost.totalCost,
    totalTokens: aiCost.totalTokens,
    conversionRate: totalUsers > 0 ? (((proUsers + agencyUsers) / totalUsers) * 100).toFixed(1) : '0',
  })
})

export default router
