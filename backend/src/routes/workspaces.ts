import { Router, Response } from 'express'
import { z } from 'zod'
import mongoose from 'mongoose'
import { Workspace } from '../models/Workspace'
import { Generation } from '../models/Generation'
import { User } from '../models/User'
import { AuditLog } from '../models/AuditLog'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { success, error, created } from '../utils/apiResponse'

const router = Router()
router.use(authenticate)

const createSchema = z.object({
  name:        z.string().min(1).max(100),
  framework:   z.enum(['react', 'vue', 'angular', 'html', 'wordpress']),
  description: z.string().max(500).optional(),
})

const updateSchema = z.object({
  name:   z.string().min(1).max(100).optional(),
  status: z.enum(['active', 'archived']).optional(),
})

// GET /api/workspaces
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, page = '1', limit = '20' } = req.query as Record<string, string>
  const filter: Record<string, unknown> = { userId: req.user!.userId, status: { $ne: 'deleted' } }
  if (status) filter.status = status

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const [workspaces, total] = await Promise.all([
    Workspace.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(parseInt(limit)),
    Workspace.countDocuments(filter),
  ])
  success(res, { workspaces, total, page: parseInt(page), limit: parseInt(limit) })
})

// POST /api/workspaces
router.post('/', validate(createSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const planLimits = { free: 2, pro: 25, agency: Infinity }
  const user = await User.findById(userId)
  if (!user) { error(res, 'User not found', 404); return }

  const count = await Workspace.countDocuments({ userId, status: { $ne: 'deleted' } })
  const limit = planLimits[user.subscription.plan as keyof typeof planLimits] ?? 2
  if (count >= limit) { error(res, `Workspace limit reached for your plan (${limit})`, 402); return }

  const workspace = await Workspace.create({ userId, ...req.body })
  await AuditLog.create({ userId, actor: user.email, actorRole: user.role, action: 'workspace.create', entityId: String(workspace._id), entityType: 'Workspace' })
  created(res, workspace)
})

// GET /api/workspaces/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  if (!mongoose.isValidObjectId(req.params.id)) { error(res, 'Invalid ID', 400); return }
  const workspace = await Workspace.findOne({ _id: req.params.id, userId: req.user!.userId })
  if (!workspace) { error(res, 'Workspace not found', 404); return }
  success(res, workspace)
})

// PATCH /api/workspaces/:id
router.patch('/:id', validate(updateSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const workspace = await Workspace.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!.userId },
    req.body,
    { new: true }
  )
  if (!workspace) { error(res, 'Workspace not found', 404); return }
  const user = await User.findById(req.user!.userId)
  const action = req.body.status === 'archived' ? 'workspace.archive' : 'workspace.rename'
  await AuditLog.create({ userId: req.user!.userId, actor: user?.email ?? '', actorRole: user?.role ?? 'user', action, entityId: String(workspace._id), entityType: 'Workspace' })
  success(res, workspace)
})

// DELETE /api/workspaces/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const workspace = await Workspace.findOneAndUpdate(
    { _id: req.params.id, userId: req.user!.userId },
    { status: 'deleted' },
    { new: true }
  )
  if (!workspace) { error(res, 'Workspace not found', 404); return }
  const user = await User.findById(req.user!.userId)
  await AuditLog.create({ userId: req.user!.userId, actor: user?.email ?? '', actorRole: user?.role ?? 'user', action: 'workspace.delete', entityId: String(workspace._id), entityType: 'Workspace' })
  success(res, null, 'Workspace deleted')
})

// GET /api/workspaces/:id/versions
router.get('/:id/versions', async (req: AuthRequest, res: Response): Promise<void> => {
  const generations = await Generation.find({ workspaceId: req.params.id, userId: req.user!.userId, status: 'completed' })
    .sort({ version: -1 })
    .select('version prompt framework createdAt creditsUsed status')
  success(res, generations)
})

export default router
