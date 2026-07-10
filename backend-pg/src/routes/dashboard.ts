import { Router, Response } from 'express'
import { prisma } from '../config/db'
import { authenticate, AuthRequest } from '../middleware/auth'
import { success } from '../utils/apiResponse'

const router = Router()
router.use(authenticate)

// GET /api/dashboard/stats
router.get('/stats', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId

  const [user, totalProjects, activeProjects, totalGenerations, downloads, failedGenerations] = await Promise.all([
    prisma.trooUser.findUnique({ where: { id: userId } }),
    prisma.trooProject.count({ where: { userId, status: { not: 'deleted' } } }),
    prisma.trooProject.count({ where: { userId, status: 'active' } }),
    prisma.trooGeneration.count({ where: { userId } }),
    prisma.trooGeneration.count({ where: { userId, zipUrl: { not: null } } }),
    prisma.trooGeneration.count({ where: { userId, status: 'failed' } }),
  ])

  success(res, {
    totalProjects,
    activeProjects,
    totalGenerations,
    downloads,
    creditsRemaining: user?.creditsRemaining ?? 0,
    creditsUsed:      user?.creditsUsed ?? 0,
    subscriptionPlan: user?.subscriptionPlan ?? 'free',
    subscriptionStatus: user?.subscriptionStatus ?? 'active',
    storageUsedBytes: Number(user?.storageUsedBytes ?? 0),
    storageLimitBytes: Number(user?.storageLimitBytes ?? 0),
    failedGenerations,
    successRate: totalGenerations > 0
      ? parseFloat(((totalGenerations - failedGenerations) / totalGenerations * 100).toFixed(1))
      : 100,
  })
})

// GET /api/dashboard/recent-activity
router.get('/recent-activity', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const generations = await prisma.trooGeneration.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      prompt: true, status: true, createdAt: true, creditsUsed: true, framework: true,
      workspace: { select: { name: true, framework: true } },
    },
  })
  success(res, generations)
})

// GET /api/dashboard/credit-usage
router.get('/credit-usage', async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const { period = 'week' } = req.query as { period: string }

  const days = period === 'month' ? 30 : 7
  const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const rows = await prisma.$queryRaw<{ day: string; credits: bigint; count: bigint }[]>`
    SELECT to_char("createdAt", 'YYYY-MM-DD') AS day, SUM("creditsUsed")::bigint AS credits, COUNT(*)::bigint AS count
    FROM troo_generations
    WHERE "userId" = ${userId} AND "createdAt" >= ${from} AND status = 'completed'
    GROUP BY day
    ORDER BY day ASC
  `

  success(res, rows.map((r) => ({ _id: r.day, credits: Number(r.credits), count: Number(r.count) })))
})

export default router
