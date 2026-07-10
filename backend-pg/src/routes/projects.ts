import { Router, Response } from 'express'
import { z } from 'zod'
import { Prisma, TrooProjectStatus } from '@prisma/client'
import { prisma } from '../config/db'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { checkSubscription } from '../services/userService'
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
  const where: Prisma.TrooProjectWhereInput = {
    userId: req.user!.userId,
    status: status ? (status as TrooProjectStatus) : { not: TrooProjectStatus.deleted },
  }

  const pageNum = parseInt(page)
  const limitNum = parseInt(limit)
  const [projects, total] = await Promise.all([
    prisma.trooProject.findMany({ where, orderBy: { updatedAt: 'desc' }, skip: (pageNum - 1) * limitNum, take: limitNum }),
    prisma.trooProject.count({ where }),
  ])
  success(res, { projects, total, page: pageNum, limit: limitNum })
})

// POST /api/projects
router.post('/', validate(createSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  await checkSubscription(userId)
  const user = await prisma.trooUser.findUnique({ where: { id: userId } })
  if (!user) { error(res, 'User not found', 404); return }

  const activeCount = await prisma.trooProject.count({ where: { userId, status: { not: 'deleted' } } })
  const plan = await prisma.trooPlan.findFirst({ where: { slug: user.subscriptionPlan, isActive: true } })
  let limit = 2
  if (plan) {
    limit = plan.featuresProjects
  } else {
    const planLimits = { free: 2, pro: 25, agency: 999999 }
    limit = planLimits[user.subscriptionPlan] ?? 2
  }

  if (activeCount >= limit) {
    error(res, `Project limit reached for your plan (${limit} projects). Please upgrade your plan.`, 402)
    return
  }

  const project = await prisma.trooProject.create({ data: { userId, ...req.body } })
  await prisma.trooAuditLog.create({
    data: { userId, actor: user.email, actorRole: user.role, action: 'project.create', entityId: project.id, entityType: 'Project' },
  })
  created(res, project)
})

// GET /api/projects/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const project = await prisma.trooProject.findFirst({ where: { id: req.params.id as string, userId: req.user!.userId, status: { not: 'deleted' } } })
  if (!project) { error(res, 'Project not found', 404); return }
  success(res, project)
})

// PATCH /api/projects/:id
router.patch('/:id', validate(updateSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.trooProject.findFirst({ where: { id: req.params.id as string, userId: req.user!.userId, status: { not: 'deleted' } } })
  if (!existing) { error(res, 'Project not found', 404); return }

  const project = await prisma.trooProject.update({ where: { id: existing.id }, data: req.body })
  const user = await prisma.trooUser.findUnique({ where: { id: req.user!.userId } })
  const action = req.body.status === 'archived' ? 'project.archive' : 'project.update'
  await prisma.trooAuditLog.create({
    data: { userId: req.user!.userId, actor: user?.email ?? '', actorRole: user?.role ?? 'user', action, entityId: project.id, entityType: 'Project' },
  })
  success(res, project)
})

// DELETE /api/projects/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.trooProject.findFirst({ where: { id: req.params.id as string, userId: req.user!.userId, status: { not: 'deleted' } } })
  if (!existing) { error(res, 'Project not found', 404); return }

  const project = await prisma.trooProject.update({ where: { id: existing.id }, data: { status: 'deleted' } })
  const user = await prisma.trooUser.findUnique({ where: { id: req.user!.userId } })
  await prisma.trooAuditLog.create({
    data: { userId: req.user!.userId, actor: user?.email ?? '', actorRole: user?.role ?? 'user', action: 'project.delete', entityId: project.id, entityType: 'Project' },
  })
  success(res, null, 'Project deleted')
})

export default router
