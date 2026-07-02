import { Router, Response } from 'express'
import { z } from 'zod'
import { authenticate, AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { success, error } from '../utils/apiResponse'
import { previewManager } from '../services/preview/PreviewManager'
import { env } from '../config/env'

const router = Router()
router.use(authenticate)

// Preview sessions are namespaced per user so one account can't poll/stop another's
// session by guessing a thread id.
const sessionKey = (req: AuthRequest): string => `${req.user!.userId}_${req.params.sessionId}`

const startSchema = z.object({
  framework: z.enum(['react', 'vue', 'angular', 'html', 'wordpress']),
  files: z.array(z.object({ path: z.string().min(1), content: z.string() })).min(1),
})

// POST /api/preview/:sessionId/start
router.post('/:sessionId/start', validate(startSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { framework, files } = req.body as z.infer<typeof startSchema>
    await previewManager.start(sessionKey(req), framework, files)
    success(res, { status: 'starting' })
  } catch (err: any) {
    error(res, err.message || 'Failed to start preview', 500)
  }
})

// GET /api/preview/:sessionId/status
router.get('/:sessionId/status', (req: AuthRequest, res: Response): void => {
  const state = previewManager.status(sessionKey(req))
  if (!state) { error(res, 'Preview session not found', 404); return }

  const previewUrl =
    state.status === 'running' && state.port ? `${env.backendUrl}/preview/${sessionKey(req)}/` : null

  success(res, { ...state, previewUrl })
})

// POST /api/preview/:sessionId/stop
router.post('/:sessionId/stop', async (req: AuthRequest, res: Response): Promise<void> => {
  await previewManager.stop(sessionKey(req))
  success(res, { status: 'stopped' })
})

export default router
