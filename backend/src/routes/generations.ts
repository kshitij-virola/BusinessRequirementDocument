import { Router, Response } from 'express'
import { z } from 'zod'
import multer from 'multer'
import { Generation } from '../models/Generation'
import { Workspace } from '../models/Workspace'
import { AuditLog } from '../models/AuditLog'
import { authenticate, AuthRequest } from '../middleware/auth'
import { checkCredits } from '../middleware/creditCheck'
import { validate } from '../middleware/validate'
import { success, error, created } from '../utils/apiResponse'
import { generationQueue } from '../queue/generationQueue'
import { storageService } from '../services/storageService'

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
    const fileExtension = req.file.originalname.split('.').pop() || 'png'
    const key = `generations/${userId}/${Date.now()}.${fileExtension}`
    const url = await storageService.uploadBuffer(key, req.file.buffer, req.file.mimetype)
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
    const uploads = await Promise.all(
      files.map(async (file) => {
        const ext = file.originalname.split('.').pop() || 'png'
        const key = `generations/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const url = await storageService.uploadBuffer(key, file.buffer, file.mimetype)
        return { key, url }
      })
    )
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
})

// POST /api/generations — enqueue a new generation
router.post('/', checkCredits('textGeneration'), validate(generateSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!.userId

  const workspace = await Workspace.findOne({ _id: req.body.workspaceId, userId })
  if (!workspace) { error(res, 'Workspace not found', 404); return }

  const version = workspace.currentVersion + 1
  const gen = await Generation.create({
    userId,
    workspaceId: req.body.workspaceId,
    version,
    prompt:    req.body.prompt,
    framework: req.body.framework,
    inputMode: req.body.inputMode,
    figmaUrl:  req.body.figmaUrl,
    imageKey:  req.body.imageKey,
    imageKeys: req.body.imageKeys,
    status:    'pending',
    creditsUsed: req.body._creditCost,
  })

  await Workspace.findByIdAndUpdate(req.body.workspaceId, { $inc: { currentVersion: 1, totalGenerations: 1 } })
  await generationQueue.add('generate', { generationId: String(gen._id), userId }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } })

  await AuditLog.create({ userId, actor: req.user!.email, actorRole: req.user!.role, action: 'generation.start', entityId: String(gen._id), entityType: 'Generation' })
  created(res, { generationId: gen._id, status: 'pending' })
})

// GET /api/generations/:id
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const gen = await Generation.findOne({ _id: req.params.id, userId: req.user!.userId })
  if (!gen) { error(res, 'Generation not found', 404); return }
  success(res, gen)
})

// GET /api/generations/:id/download
router.get('/:id/download', async (req: AuthRequest, res: Response): Promise<void> => {
  const gen = await Generation.findOne({ _id: req.params.id, userId: req.user!.userId, status: 'completed' })
  if (!gen) { error(res, 'Generation not found or not completed', 404); return }

  let downloadUrl = gen.zipUrl
  if (!downloadUrl && gen.outputFiles?.length) {
    const zipBuffer = await storageService.packToZip(gen.outputFiles)
    const key = `themes/${req.user!.userId}/${gen._id}/theme.zip`
    downloadUrl = await storageService.uploadBuffer(key, zipBuffer, 'application/zip')
    gen.zipKey = key
    gen.zipUrl = downloadUrl
    await gen.save()
  }

  if (!downloadUrl) { error(res, 'Download not available', 404); return }
  success(res, { url: downloadUrl })
})

// GET /api/generations — user history
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = '1', limit = '20', status, framework } = req.query as Record<string, string>
  const filter: Record<string, unknown> = { userId: req.user!.userId }
  if (status) filter.status = status
  if (framework) filter.framework = framework

  const skip = (parseInt(page) - 1) * parseInt(limit)
  const [generations, total] = await Promise.all([
    Generation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit))
      .populate('workspaceId', 'name'),
    Generation.countDocuments(filter),
  ])
  success(res, { generations, total })
})

export default router
