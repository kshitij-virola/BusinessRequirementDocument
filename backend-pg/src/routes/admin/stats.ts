import { Router, Response } from 'express'
import { prisma } from '../../config/db'
import { authenticate, AuthRequest } from '../../middleware/auth'
import { requireAdmin } from '../../middleware/rbac'
import { success } from '../../utils/apiResponse'

const router = Router()
router.use(authenticate, requireAdmin)

// GET /api/admin/stats — KPIs
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [totalUsers, activeUsers, newUsers, proUsers, agencyUsers, totalGenerations, aiCostAgg] = await Promise.all([
    prisma.trooUser.count(),
    prisma.trooUser.count({ where: { isSuspended: false } }),
    prisma.trooUser.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.trooUser.count({ where: { subscriptionPlan: 'pro' } }),
    prisma.trooUser.count({ where: { subscriptionPlan: 'agency' } }),
    prisma.trooGeneration.count(),
    prisma.trooGeneration.aggregate({ _sum: { aiCostUsd: true, tokensUsed: true } }),
  ])

  const mrr = (proUsers * 29) + (agencyUsers * 99)
  const aiCost = { totalCost: aiCostAgg._sum.aiCostUsd ?? 0, totalTokens: aiCostAgg._sum.tokensUsed ?? 0 }

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
