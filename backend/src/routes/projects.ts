import { Router, Response } from 'express'
import { z } from 'zod'
import mongoose from 'mongoose'
import { Project } from '../models/Project'
import { User } from '../models/User'
import { Plan } from '../models/Plan'
import { AuditLog } from '../models/AuditLog'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { success, error, created } from '../utils/apiResponse'

const router = Router()
router.use(authenticate)

const createSchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().max(500).optional(),
})

const updateSchema = z.object({
  name:        z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status:      z.enum(['active', 'archived']).optional(),
})

// GET /api/projects
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, page = '1', limit = '20' } = req.query as Record<string, string>
  const filter: Record<string, unknown> = { userId: req.user!.userId, status: { $ne: 'deleted' } }
  if (status) filter.status = status

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const [projects, total] = await Promise.all([
    Project.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(parseInt(limit)),
    Project.countDocuments(filter),
  ])
  success(res, { projects, total, page: parseInt(page), limit: parseInt(limit) })
})

// POST /api/projects
router.post('/', validate(createSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const user = await User.findById(userId)
  if (!user) { error(res, 'User not found', 404); return }
  await user.checkSubscription()

  // Check project limit based on plan features
  const activeCount = await Project.countDocuments({ userId, status: { $ne: 'deleted' } })
  const plan = await Plan.findOne({ slug: user.subscription.plan, isActive: true })
  let limit = 2 // default fallback for Free plan
  if (plan) {
    limit = plan.features.projects
  } else {
    // Fallback static limits if plan not found in database
    const planLimits = { free: 2, pro: 25, agency: 999999 }
    limit = planLimits[user.subscription.plan as keyof typeof planLimits] ?? 2
  }

  if (activeCount >= limit) {
    error(res, `Project limit reached for your plan (${limit} projects). Please upgrade your plan.`, 402)
    return
  }

  const project = await Project.create({ userId, ...req.body })
  await AuditLog.create({
    userId,
    actor: user.email,
    actorRole: user.role,
    action: 'project.create',
    entityId: String(project._id),
    entityType: 'Project',
  })
  created(res, project)
})

// GET /api/projects/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  if (!mongoose.isValidObjectId(req.params.id)) { error(res, 'Invalid ID', 400); return }
  const project = await Project.findOne({ _id: req.params.id, userId: req.user!.userId, status: { $ne: 'deleted' } })
  if (!project) { error(res, 'Project not found', 404); return }
  success(res, project)
})

// PATCH /api/projects/:id
router.patch('/:id', validate(updateSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  if (!mongoose.isValidObjectId(req.params.id)) { error(res, 'Invalid ID', 400); return }
  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!.userId, status: { $ne: 'deleted' } },
    req.body,
    { new: true }
  )
  if (!project) { error(res, 'Project not found', 404); return }
  const user = await User.findById(req.user!.userId)
  const action = req.body.status === 'archived' ? 'project.archive' : 'project.update'
  await AuditLog.create({
    userId: req.user!.userId,
    actor: user?.email ?? '',
    actorRole: user?.role ?? 'user',
    action,
    entityId: String(project._id),
    entityType: 'Project',
  })
  success(res, project)
})

// DELETE /api/projects/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  if (!mongoose.isValidObjectId(req.params.id)) { error(res, 'Invalid ID', 400); return }
  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!.userId, status: { $ne: 'deleted' } },
    { status: 'deleted' },
    { new: true }
  )
  if (!project) { error(res, 'Project not found', 404); return }
  const user = await User.findById(req.user!.userId)
  await AuditLog.create({
    userId: req.user!.userId,
    actor: user?.email ?? '',
    actorRole: user?.role ?? 'user',
    action: 'project.delete',
    entityId: String(project._id),
    entityType: 'Project',
  })
  success(res, null, 'Project deleted')
})

export default router
