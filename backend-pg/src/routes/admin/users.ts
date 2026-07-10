import { Router, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../../config/db'
import { STATIC_PLAN_LIMITS } from '../../services/planLimits'
import { authenticate, AuthRequest } from '../../middleware/auth'
import { requireAdmin, requireSuperAdmin } from '../../middleware/rbac'
import { creditService } from '../../services/creditService'
import { success, error } from '../../utils/apiResponse'

const router = Router()
router.use(authenticate, requireAdmin)

const USER_SELECT = {
  id: true, name: true, email: true, role: true, avatar: true, isEmailVerified: true, isSuspended: true,
  subscriptionPlan: true, subscriptionStatus: true, creditsRemaining: true, creditsUsed: true,
  storageUsedBytes: true, storageLimitBytes: true, createdAt: true, updatedAt: true,
}

// GET /api/admin/users
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const page   = String(req.query.page   ?? '1')
  const limit  = String(req.query.limit  ?? '20')
  const search = req.query.search ? String(req.query.search) : undefined
  const plan   = req.query.plan   ? String(req.query.plan)   : undefined
  const status = req.query.status ? String(req.query.status) : undefined

  const where: Prisma.TrooUserWhereInput = {}
  if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }]
  if (plan) where.subscriptionPlan = plan as Prisma.EnumTrooSubscriptionPlanFilter['equals']
  if (status === 'suspended') where.isSuspended = true
  if (status === 'active') where.isSuspended = false

  const pageNum = parseInt(page)
  const limitNum = parseInt(limit)
  const [users, total] = await Promise.all([
    prisma.trooUser.findMany({ where, select: USER_SELECT, orderBy: { createdAt: 'desc' }, skip: (pageNum - 1) * limitNum, take: limitNum }),
    prisma.trooUser.count({ where }),
  ])
  success(res, { users, total })
})

// GET /api/admin/users/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.trooUser.findUnique({ where: { id: req.params.id as string }, select: USER_SELECT })
  if (!user) { error(res, 'User not found', 404); return }
  success(res, user)
})

// PATCH /api/admin/users/:id/suspend
router.patch('/:id/suspend', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const user = await prisma.trooUser.update({ where: { id }, data: { isSuspended: true } }).catch(() => null)
  if (!user) { error(res, 'User not found', 404); return }
  await prisma.trooAuditLog.create({ data: { userId: req.user!.userId, actor: req.user!.email, actorRole: req.user!.role, action: 'admin.suspend_user', entityId: id, entityType: 'User' } })
  success(res, null, 'User suspended')
})

// PATCH /api/admin/users/:id/activate
router.patch('/:id/activate', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const user = await prisma.trooUser.update({ where: { id }, data: { isSuspended: false } }).catch(() => null)
  if (!user) { error(res, 'User not found', 404); return }
  await prisma.trooAuditLog.create({ data: { userId: req.user!.userId, actor: req.user!.email, actorRole: req.user!.role, action: 'admin.activate_user', entityId: id, entityType: 'User' } })
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

  const user = await prisma.trooUser.update({ where: { id }, data: { role: role as any } }).catch(() => null)
  if (!user) { error(res, 'User not found', 404); return }

  await prisma.trooAuditLog.create({
    data: { userId: req.user!.userId, actor: req.user!.email, actorRole: req.user!.role, action: 'admin.change_user_role', entityId: id, entityType: 'User', metadata: { role } },
  })
  success(res, null, `User role updated to ${role}`)
})

// PATCH /api/admin/users/:id/reset-credits
router.patch('/:id/reset-credits', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id)
  const user = await prisma.trooUser.findUnique({ where: { id } })
  if (!user) { error(res, 'User not found', 404); return }
  const plan = user.subscriptionPlan
  const planDoc = await prisma.trooPlan.findUnique({ where: { slug: plan } })
  const credits = planDoc ? planDoc.featuresGenerationsPerMonth : STATIC_PLAN_LIMITS[plan].credits
  await creditService.reset(id, credits)
  await prisma.trooAuditLog.create({ data: { userId: req.user!.userId, actor: req.user!.email, actorRole: req.user!.role, action: 'admin.reset_credits', entityId: id, entityType: 'User' } })
  success(res, null, 'Credits reset')
})

export default router
