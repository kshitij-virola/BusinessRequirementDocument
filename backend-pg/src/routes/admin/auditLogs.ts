import { Router, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../../config/db'
import { authenticate, AuthRequest } from '../../middleware/auth'
import { requireAdmin } from '../../middleware/rbac'
import { success } from '../../utils/apiResponse'

const router = Router()
router.use(authenticate, requireAdmin)

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '50', action, actionPrefix, userId, actor } = req.query as Record<string, string>
  const where: Prisma.TrooAuditLogWhereInput = {}
  if (action) where.action = action
  if (actionPrefix) where.action = { startsWith: `${actionPrefix}.` }
  if (userId) where.userId = userId
  if (actor) where.actor = { contains: actor, mode: 'insensitive' }

  const pageNum = parseInt(page)
  const limitNum = parseInt(limit)
  const [logs, total] = await Promise.all([
    prisma.trooAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.trooAuditLog.count({ where }),
  ])
  success(res, { logs, total })
})

export default router
