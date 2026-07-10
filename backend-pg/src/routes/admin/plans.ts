import { Router, Response } from 'express'
import { prisma } from '../../config/db'
import { invalidatePlanLimits } from '../../services/planLimits'
import { authenticate, AuthRequest } from '../../middleware/auth'
import { requireAdmin } from '../../middleware/rbac'
import { success, error, created } from '../../utils/apiResponse'

const router = Router()
router.use(authenticate, requireAdmin)

router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  const plans = await prisma.trooPlan.findMany({ orderBy: { monthlyPrice: 'asc' } })
  success(res, plans)
})

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const plan = await prisma.trooPlan.create({ data: req.body })
  invalidatePlanLimits()
  await prisma.trooAuditLog.create({ data: { userId: req.user!.userId, actor: req.user!.email, actorRole: req.user!.role, action: 'admin.update_plan', entityId: plan.id, entityType: 'Plan', metadata: req.body } })
  created(res, plan)
})

router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const plan = await prisma.trooPlan.update({ where: { id: req.params.id as string }, data: req.body }).catch(() => null)
  if (!plan) { error(res, 'Plan not found', 404); return }
  invalidatePlanLimits()
  await prisma.trooAuditLog.create({ data: { userId: req.user!.userId, actor: req.user!.email, actorRole: req.user!.role, action: 'admin.update_plan', entityId: plan.id, entityType: 'Plan', metadata: req.body } })
  success(res, plan)
})

export default router
