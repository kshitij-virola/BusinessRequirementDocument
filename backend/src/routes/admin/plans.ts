import { Router, Response } from 'express'
import { Plan } from '../../models/Plan'
import { AuditLog } from '../../models/AuditLog'
import { authenticate, AuthRequest } from '../../middleware/auth'
import { requireAdmin } from '../../middleware/rbac'
import { success, error, created } from '../../utils/apiResponse'

const router = Router()
router.use(authenticate, requireAdmin)

router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  const plans = await Plan.find().sort({ monthlyPrice: 1 })
  success(res, plans)
})

router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const plan = await Plan.create(req.body)
  await AuditLog.create({ userId: req.user!.userId, actor: req.user!.email, actorRole: req.user!.role, action: 'admin.update_plan', entityId: String(plan._id), entityType: 'Plan', metadata: req.body })
  created(res, plan)
})

router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const plan = await Plan.findByIdAndUpdate(req.params.id, req.body, { new: true })
  if (!plan) { error(res, 'Plan not found', 404); return }
  await AuditLog.create({ userId: req.user!.userId, actor: req.user!.email, actorRole: req.user!.role, action: 'admin.update_plan', entityId: String(plan._id), entityType: 'Plan', metadata: req.body })
  success(res, plan)
})

export default router
