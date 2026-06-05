import { Router, Response } from 'express'
import { AuditLog } from '../../models/AuditLog'
import { authenticate, AuthRequest } from '../../middleware/auth'
import { requireAdmin } from '../../middleware/rbac'
import { success } from '../../utils/apiResponse'

const router = Router()
router.use(authenticate, requireAdmin)

router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '50', action, userId } = req.query as Record<string, string>
  const filter: Record<string, unknown> = {}
  if (action) filter.action = action
  if (userId) filter.userId = userId

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit))
      .populate('userId', 'name email'),
    AuditLog.countDocuments(filter),
  ])
  success(res, { logs, total })
})

export default router
