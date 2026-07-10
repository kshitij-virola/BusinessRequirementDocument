import { Router, Response } from 'express'
import { z } from 'zod'
import multer from 'multer'
import { Prisma } from '@prisma/client'
import { prisma } from '../config/db'
import { authenticate, AuthRequest } from '../middleware/auth'
import { checkCredits } from '../middleware/creditCheck'
import { validate } from '../middleware/validate'
import { success, error, created } from '../utils/apiResponse'
import { creditService } from '../services/creditService'
import { storageService } from '../services/storageService'
import { checkSubscription } from '../services/userService'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

const router = Router()
router.use(authenticate)

// POST /api/generations/upload-image — upload single screenshot
router.post('/upload-image', upload.single('image'), async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) { error(res, 'No file uploaded', 400); return }

  try {
    const userId = req.user!.userId
    const user = await prisma.trooUser.findUnique({ where: { id: userId } })
    if (!user) { error(res, 'User not found', 404); return }

    const fileSize = req.file.buffer.length
    if (Number(user.storageUsedBytes) + fileSize > Number(user.storageLimitBytes)) {
      error(res, 'Storage limit exceeded. Please upgrade your plan or delete existing files.', 400)
      return
    }

    const fileExtension = req.file.originalname.split('.').pop() || 'png'
    const key = `generations/${userId}/${Date.now()}.${fileExtension}`
    const url = await storageService.uploadBuffer(key, req.file.buffer, req.file.mimetype)

    await prisma.trooUser.update({ where: { id: userId }, data: { storageUsedBytes: { increment: fileSize } } })

    success(res, { key, url })
  } catch (err: any) {
    error(res, err.message || 'Upload failed', 500)
  }
})

// POST /api/generations/upload-images — upload multiple images (for text mode attachments)
router.post('/upload-images', upload.array('images', 10), async (req: AuthRequest, res: Response): Promise<void> => {
  const files = req.files as Express.Multer.File[]
  if (!files || files.length === 0) { error(res, 'No files uploaded', 400); return }

  try {
    const userId = req.user!.userId
    const user = await prisma.trooUser.findUnique({ where: { id: userId } })
    if (!user) { error(res, 'User not found', 404); return }

    const totalSize = files.reduce((sum, f) => sum + f.buffer.length, 0)
    if (Number(user.storageUsedBytes) + totalSize > Number(user.storageLimitBytes)) {
      error(res, 'Storage limit exceeded. Please upgrade your plan or delete existing files.', 400)
      return
    }

    const uploads = await Promise.all(
      files.map(async (file) => {
        const ext = file.originalname.split('.').pop() || 'png'
        const key = `generations/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const url = await storageService.uploadBuffer(key, file.buffer, file.mimetype)
        return { key, url }
      })
    )

    await prisma.trooUser.update({ where: { id: userId }, data: { storageUsedBytes: { increment: totalSize } } })

    success(res, { uploads })
  } catch (err: any) {
    error(res, err.message || 'Upload failed', 500)
  }
})

const generateSchema = z.object({
  workspaceId: z.string(),
  prompt:      z.string().min(1).max(2000),
  framework:   z.enum(['react', 'vue', 'angular', 'html', 'wordpress']),
  inputMode:   z.enum(['text', 'figma', 'image']).default('text'),
  figmaUrl:    z.string().url().optional(),
  imageKey:    z.string().optional(),
  imageKeys:   z.array(z.string()).max(10).optional(),
  threadId:    z.string().optional(),
  projectId:   z.string().optional(),
})

// POST /api/generations — enqueue a new generation
router.post('/', checkCredits(), validate(generateSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const body = req.body as z.infer<typeof generateSchema>

  const workspace = await prisma.trooWorkspace.findFirst({ where: { id: body.workspaceId, userId } })
  if (!workspace) { error(res, 'Workspace not found', 404); return }

  const version = workspace.currentVersion + 1
  const gen = await prisma.trooGeneration.create({
    data: {
      userId,
      workspaceId: body.workspaceId,
      threadId: body.threadId,
      projectId: body.projectId,
      version,
      prompt: body.prompt,
      framework: body.framework,
      inputMode: body.inputMode,
      figmaUrl: body.figmaUrl,
      imageKey: body.imageKey,
      imageKeys: body.imageKeys ?? [],
      status: 'pending',
      creditsUsed: req._creditCost || 0,
    },
  })

  await prisma.trooWorkspace.update({ where: { id: body.workspaceId }, data: { currentVersion: { increment: 1 }, totalGenerations: { increment: 1 } } })
  await prisma.trooAuditLog.create({ data: { userId, actor: req.user!.email, actorRole: req.user!.role, action: 'generation.start', entityId: gen.id, entityType: 'Generation' } })
  created(res, { generationId: gen.id, status: 'pending' })
})

// PATCH /api/generations/:id/complete — called by the frontend after the outer API (SSE) finishes
const completeSchema = z.object({
  status:       z.enum(['completed', 'failed']),
  projectId:    z.string().optional(),
  filesCount:   z.number().int().nonnegative().optional(),
  errorMessage: z.string().optional(),
})

router.patch('/:id/complete', validate(completeSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId
  const gen = await prisma.trooGeneration.findFirst({ where: { id: req.params.id as string, userId } })
  if (!gen) { error(res, 'Generation not found', 404); return }

  // Idempotency guard: only process if the generation is still pending.
  // A second call (e.g. duplicate SSE event) is silently accepted to avoid
  // double-deducting or double-refunding credits.
  if (gen.status !== 'pending') {
    success(res, { generationId: gen.id, status: gen.status })
    return
  }

  const { status, projectId, filesCount, errorMessage } = req.body as z.infer<typeof completeSchema>
  const processingTimeMs = Date.now() - gen.createdAt.getTime()

  await prisma.trooGeneration.update({
    where: { id: gen.id },
    data: {
      status,
      ...(projectId ? { projectId } : {}),
      ...(filesCount !== undefined ? { filesCount } : {}),
      ...(errorMessage ? { errorMessage } : {}),
      processingTimeMs,
    },
  })

  const user = await prisma.trooUser.findUnique({ where: { id: userId } })
  if (status === 'completed') {
    // Credits are only deducted on success. The POST /generations route checks
    // balance but does NOT deduct, so there is nothing to refund on failure.
    await creditService.deduct(userId, gen.creditsUsed, `generation:${gen.id}`)
    await prisma.trooAuditLog.create({ data: { userId, actor: user?.email ?? userId, actorRole: user?.role ?? 'user', action: 'generation.complete', entityId: gen.id, entityType: 'Generation', metadata: { projectId, filesCount, processingTimeMs } } })
  } else {
    await prisma.trooAuditLog.create({ data: { userId, actor: user?.email ?? userId, actorRole: user?.role ?? 'user', action: 'generation.fail', entityId: gen.id, entityType: 'Generation', metadata: { errorMessage } } })
  }

  success(res, { generationId: gen.id, status })
})

// GET /api/generations/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const gen = await prisma.trooGeneration.findFirst({ where: { id: req.params.id as string, userId: req.user!.userId } })
  if (!gen) { error(res, 'Generation not found', 404); return }
  success(res, gen)
})

// GET /api/generations/:id/download
router.get('/:id/download', async (req: AuthRequest, res: Response): Promise<void> => {
  const gen = await prisma.trooGeneration.findFirst({ where: { id: req.params.id as string, userId: req.user!.userId, status: 'completed' } })
  if (!gen) { error(res, 'Generation not found or not completed', 404); return }

  let downloadUrl = gen.zipUrl
  const outputFiles = gen.outputFiles as { path: string; content: string }[] | null
  if (!downloadUrl && outputFiles?.length) {
    const userId = req.user!.userId
    await checkSubscription(userId)
    const user = await prisma.trooUser.findUnique({ where: { id: userId } })
    if (!user) { error(res, 'User not found', 404); return }

    const plan = await prisma.trooPlan.findFirst({ where: { slug: user.subscriptionPlan, isActive: true } })
    const cost = plan?.creditCostThemeExport ?? 2

    if (user.creditsRemaining < cost) {
      error(res, 'Insufficient credits to export theme. Please upgrade your plan.', 402, {
        required: cost,
        remaining: user.creditsRemaining,
      })
      return
    }

    const zipBuffer = await storageService.packToZip(outputFiles)
    const key = `themes/${userId}/${gen.id}/theme.zip`
    downloadUrl = await storageService.uploadBuffer(key, zipBuffer, 'application/zip')
    await prisma.trooGeneration.update({ where: { id: gen.id }, data: { zipKey: key, zipUrl: downloadUrl } })

    await creditService.deduct(userId, cost, `export:${gen.id}`)
    await prisma.trooAuditLog.create({
      data: { userId, actor: user.email, actorRole: user.role, action: 'theme.export', entityId: gen.id, entityType: 'Generation', metadata: { cost } },
    })
  }

  if (!downloadUrl) { error(res, 'Download not available', 404); return }
  success(res, { url: downloadUrl })
})

// GET /api/generations — user history
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20', status, framework } = req.query as Record<string, string>
  const where: Prisma.TrooGenerationWhereInput = { userId: req.user!.userId }
  if (status) where.status = status as Prisma.EnumTrooGenerationStatusFilter['equals']
  if (framework) where.framework = framework as Prisma.EnumTrooFrameworkFilter['equals']

  const pageNum = parseInt(page)
  const limitNum = parseInt(limit)
  const [generations, total] = await Promise.all([
    prisma.trooGeneration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: { workspace: { select: { name: true } } },
    }),
    prisma.trooGeneration.count({ where }),
  ])
  success(res, { generations, total })
})

export default router
