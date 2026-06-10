import { Router, Response } from 'express'
import { Workspace } from '../models/Workspace'
import { Generation } from '../models/Generation'
import { authenticate, AuthRequest } from '../middleware/auth'
import { User } from '../models/User'
import { success } from '../utils/apiResponse'

const router = Router()
router.use(authenticate)

// GET /api/dashboard/stats
router.get('/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId

  const [user, totalProjects, activeProjects, totalGenerations, downloads, failedGenerations] = await Promise.all([
    User.findById(userId),
    Workspace.countDocuments({ userId, status: { $ne: 'deleted' } }),
    Workspace.countDocuments({ userId, status: 'active' }),
    Generation.countDocuments({ userId }),
    Generation.countDocuments({ userId, zipUrl: { $exists: true } }),
    Generation.countDocuments({ userId, status: 'failed' }),
  ])

  success(res, {
    totalProjects,
    activeProjects,
    totalGenerations,
    downloads,
    creditsRemaining: user?.credits.remaining ?? 0,
    creditsUsed:      user?.credits.used ?? 0,
    subscriptionPlan: user?.subscription.plan ?? 'free',
    subscriptionStatus: user?.subscription.status ?? 'active',
    storageUsedBytes: user?.storage.usedBytes ?? 0,
    storageLimitBytes: user?.storage.limitBytes ?? 0,
    failedGenerations,
    successRate: totalGenerations > 0
      ? parseFloat(((totalGenerations - failedGenerations) / totalGenerations * 100).toFixed(1))
      : 100,
  })
})

// GET /api/dashboard/recent-activity
router.get('/recent-activity', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const generations = await Generation.find({ userId })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('workspaceId', 'name framework')
    .select('prompt status createdAt creditsUsed framework')
  success(res, generations)
})

// GET /api/dashboard/credit-usage
router.get('/credit-usage', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const { period = 'week' } = req.query as { period: string }

  const days = period === 'month' ? 30 : 7
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const usage = await Generation.aggregate([
    { $match: { userId, createdAt: { $gte: from }, status: 'completed' } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        credits: { $sum: '$creditsUsed' },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ])

  success(res, usage)
})

export default router
