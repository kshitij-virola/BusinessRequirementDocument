import { Router, Response } from 'express'
import { User, PLAN_LIMITS } from '../../models/User'
import { Plan } from '../../models/Plan'
import { AuditLog } from '../../models/AuditLog'
import { authenticate, AuthRequest } from '../../middleware/auth'
import { requireAdmin, requireSuperAdmin } from '../../middleware/rbac'
import { creditService } from '../../services/creditService'
import { success, error } from '../../utils/apiResponse'

const router = Router()
router.use(authenticate, requireAdmin)

// GET /api/admin/users
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const page   = String(req.query.page   ?? '1')
  const limit  = String(req.query.limit  ?? '20')
  const search = req.query.search ? String(req.query.search) : undefined
  const plan   = req.query.plan   ? String(req.query.plan)   : undefined
  const status = req.query.status ? String(req.query.status) : undefined

  const filter: Record<string, unknown> = {}
  if (search) filter.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }]
  if (plan) filter['subscription.plan'] = plan
  if (status === 'suspended') filter.isSuspended = true
  if (status === 'active') filter.isSuspended = false

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit))
      .select('-password -passwordResetToken -emailVerificationToken'),
    User.countDocuments(filter),
  ])
  success(res, { users, total })
})

// GET /api/admin/users/:id
router.get('/:id', async (_req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(_req.params.id).select('-password')
  if (!user) { error(res, 'User not found', 404); return }
  success(res, user)
})

// PATCH /api/admin/users/:id/suspend
router.patch('/:id/suspend', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const user = await User.findByIdAndUpdate(id, { isSuspended: true }, { new: true })
  if (!user) { error(res, 'User not found', 404); return }
  await AuditLog.create({ userId: req.user!.userId, actor: req.user!.email, actorRole: req.user!.role, action: 'admin.suspend_user', entityId: id, entityType: 'User' })
  success(res, null, 'User suspended')
})

// PATCH /api/admin/users/:id/activate
router.patch('/:id/activate', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const user = await User.findByIdAndUpdate(id, { isSuspended: false }, { new: true })
  if (!user) { error(res, 'User not found', 404); return }
  await AuditLog.create({ userId: req.user!.userId, actor: req.user!.email, actorRole: req.user!.role, action: 'admin.activate_user', entityId: id, entityType: 'User' })
  success(res, null, 'User activated')
})

// PATCH /api/admin/users/:id/role — superadmin only
router.patch('/:id/role', requireSuperAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const { role } = req.body as { role: string }

  if (!['user', 'admin'].includes(role)) {
    error(res, 'Invalid role. Must be "user" or "admin"', 400)
    return
  }
  if (id === req.user!.userId) {
    error(res, 'Cannot change your own role', 400)
    return
  }

  const user = await User.findByIdAndUpdate(id, { role }, { new: true })
  if (!user) { error(res, 'User not found', 404); return }

  await AuditLog.create({
    userId:    req.user!.userId,
    actor:     req.user!.email,
    actorRole: req.user!.role,
    action:    'admin.change_user_role',
    entityId:  id,
    entityType: 'User',
    metadata:  { role },
  })
  success(res, null, `User role updated to ${role}`)
})

// PATCH /api/admin/users/:id/reset-credits
router.patch('/:id/reset-credits', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const user = await User.findById(id)
  if (!user) { error(res, 'User not found', 404); return }
  const plan = user.subscription.plan as 'free' | 'pro' | 'agency'
  const planDoc = await Plan.findOne({ slug: plan })
  const credits = planDoc ? planDoc.features.generationsPerMonth : PLAN_LIMITS[plan].credits
  await creditService.reset(id, credits)
  await AuditLog.create({ userId: req.user!.userId, actor: req.user!.email, actorRole: req.user!.role, action: 'admin.reset_credits', entityId: id, entityType: 'User' })
  success(res, null, 'Credits reset')
})

export default router
