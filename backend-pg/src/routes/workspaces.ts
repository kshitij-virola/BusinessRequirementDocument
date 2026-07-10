import { Router, Response } from 'express'
import { z } from 'zod'
import { Prisma, TrooWorkspaceStatus } from '@prisma/client'
import { prisma } from '../config/db'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { checkSubscription } from '../services/userService'
import { success, error, created } from '../utils/apiResponse'

const router = Router()
router.use(authenticate)

const createSchema = z.object({
  name:        z.string().min(1).max(100),
  framework:   z.enum(['react', 'vue', 'angular', 'html', 'wordpress']),
  description: z.string().max(500).optional(),
  projectId:   z.string().optional(),
})

const updateSchema = z.object({
  name:   z.string().min(1).max(100).optional(),
  status: z.enum(['active', 'archived']).optional(),
})

// GET /api/workspaces
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { status, projectId, page = '1', limit = '20', generations } = req.query as Record<string, string>
  const where: Prisma.TrooWorkspaceWhereInput = {
    userId: req.user!.userId,
    status: status ? (status as TrooWorkspaceStatus) : { not: TrooWorkspaceStatus.deleted },
  }
  if (projectId) where.projectId = projectId

  const pageNum = parseInt(page)
  const limitNum = parseInt(limit)
  const [workspaces, total] = await Promise.all([
    prisma.trooWorkspace.findMany({ where, orderBy: { updatedAt: 'desc' }, skip: (pageNum - 1) * limitNum, take: limitNum }),
    prisma.trooWorkspace.count({ where }),
  ])

  if (generations === 'true') {
    const workspaceIds = workspaces.map((w) => w.id)
    const gens = await prisma.trooGeneration.findMany({
      where: { workspaceId: { in: workspaceIds }, userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        workspaceId: true, version: true, prompt: true, framework: true, inputMode: true, status: true,
        creditsUsed: true, filesCount: true, threadId: true, projectId: true, createdAt: true,
        processingTimeMs: true, errorMessage: true,
      },
    })
    const gensByWorkspace = gens.reduce<Record<string, typeof gens>>((acc, g) => {
      if (!acc[g.workspaceId]) acc[g.workspaceId] = []
      acc[g.workspaceId].push(g)
      return acc
    }, {})
    const workspacesWithGenerations = workspaces.map((w) => ({
      ...w,
      generations: gensByWorkspace[w.id] ?? [],
    }))
    success(res, { workspaces: workspacesWithGenerations, total, page: pageNum, limit: limitNum })
    return
  }

  success(res, { workspaces, total, page: pageNum, limit: limitNum })
})

// POST /api/workspaces
router.post('/', validate(createSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const { projectId, ...body } = req.body as z.infer<typeof createSchema>

  if (projectId) {
    const project = await prisma.trooProject.findFirst({ where: { id: projectId, userId, status: { not: 'deleted' } } })
    if (!project) { error(res, 'Project not found', 404); return }
  }

  await checkSubscription(userId)
  const user = (await prisma.trooUser.findUnique({ where: { id: userId } }))!
  if (!user) { error(res, 'User not found', 404); return }

  if (user.creditsRemaining <= 0) {
    error(res, 'Insufficient credits to create a new workspace. Please upgrade your plan or wait for your credits to reset.', 402)
    return
  }

  const planLimits = { free: 2, pro: 25, agency: Infinity }
  const count = await prisma.trooWorkspace.count({ where: { userId, status: { not: 'deleted' } } })
  const limit = planLimits[user.subscriptionPlan] ?? 2
  if (count >= limit) { error(res, `Workspace limit reached for your plan (${limit} projects). Please upgrade your plan.`, 402); return }

  const workspace = await prisma.trooWorkspace.create({ data: { userId, projectId, ...body } })
  if (projectId) await prisma.trooProject.update({ where: { id: projectId }, data: { workspaceCount: { increment: 1 } } })
  await prisma.trooAuditLog.create({ data: { userId, actor: user.email, actorRole: user.role, action: 'workspace.create', entityId: workspace.id, entityType: 'Workspace' } })
  created(res, workspace)
})

// GET /api/workspaces/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const workspace = await prisma.trooWorkspace.findFirst({ where: { id: req.params.id as string, userId: req.user!.userId } })
  if (!workspace) { error(res, 'Workspace not found', 404); return }
  success(res, workspace)
})

// PATCH /api/workspaces/:id
router.patch('/:id', validate(updateSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await prisma.trooWorkspace.findFirst({ where: { id: req.params.id as string, userId: req.user!.userId } })
  if (!existing) { error(res, 'Workspace not found', 404); return }

  const workspace = await prisma.trooWorkspace.update({ where: { id: existing.id }, data: req.body })
  const user = await prisma.trooUser.findUnique({ where: { id: req.user!.userId } })
  const action = req.body.status === 'archived' ? 'workspace.archive' : 'workspace.rename'
  await prisma.trooAuditLog.create({ data: { userId: req.user!.userId, actor: user?.email ?? '', actorRole: user?.role ?? 'user', action, entityId: workspace.id, entityType: 'Workspace' } })
  success(res, workspace)
})

// DELETE /api/workspaces/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const workspace = await prisma.trooWorkspace.findFirst({ where: { id: req.params.id as string, userId: req.user!.userId } })
  if (!workspace) { error(res, 'Workspace not found', 404); return }
  if (workspace.status === 'deleted') {
    success(res, null, 'Workspace already deleted')
    return
  }

  await prisma.trooWorkspace.update({ where: { id: workspace.id }, data: { status: 'deleted' } })
  if (workspace.projectId) await prisma.trooProject.update({ where: { id: workspace.projectId }, data: { workspaceCount: { decrement: 1 } } })

  const user = await prisma.trooUser.findUnique({ where: { id: req.user!.userId } })
  await prisma.trooAuditLog.create({ data: { userId: req.user!.userId, actor: user?.email ?? '', actorRole: user?.role ?? 'user', action: 'workspace.delete', entityId: workspace.id, entityType: 'Workspace' } })
  success(res, null, 'Workspace deleted')
})

// GET /api/workspaces/:id/versions
router.get('/:id/versions', async (req: AuthRequest, res: Response): Promise<void> => {
  const generations = await prisma.trooGeneration.findMany({
    where: { workspaceId: req.params.id as string, userId: req.user!.userId, status: 'completed' },
    orderBy: { version: 'desc' },
    select: { version: true, prompt: true, framework: true, createdAt: true, creditsUsed: true, status: true },
  })
  success(res, generations)
})

export default router
