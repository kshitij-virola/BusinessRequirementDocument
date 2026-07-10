import { Router, Request, Response } from 'express'
import { prisma } from '../../config/db'
import { success, error } from '../../utils/apiResponse'

const router = Router()

const threadSelect = { id: true, title: true, created_at: true, updated_at: true, user_id: true }

// GET /api/threads
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { userId, page = '1', limit = '20' } = req.query as Record<string, string>
  const pageNum = parseInt(page)
  const limitNum = parseInt(limit)
  const where = userId ? { user_id: userId } : {}

  const [threads, total] = await Promise.all([
    prisma.threads_thread.findMany({
      where,
      select: threadSelect,
      orderBy: { updated_at: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.threads_thread.count({ where }),
  ])

  success(res, { threads, total, page: pageNum, limit: limitNum })
})

// GET /api/threads/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const thread = await prisma.threads_thread.findUnique({ where: { id: req.params.id as string }, select: threadSelect })
  if (!thread) { error(res, 'Thread not found', 404); return }
  success(res, thread)
})

// GET /api/threads/:id/messages
router.get('/:id/messages', async (req: Request, res: Response): Promise<void> => {
  const messages = await prisma.threads_message.findMany({
    where: { thread_id: req.params.id as string },
    select: {
      id: true, content: true, status: true, type: true, mode: true,
      error_message: true, created_at: true,
      completion_tokens: true, prompt_tokens: true, total_tokens: true,
    },
    orderBy: { created_at: 'asc' },
  })

  success(res, messages)
})

export default router
