import { Router, Request, Response } from 'express'
import { prisma } from '../../config/db'
import { success, error } from '../../utils/apiResponse'

const router = Router()

const userSelect = {
  id: true, email: true, first_name: true, last_name: true,
  is_staff: true, is_active: true, is_superuser: true,
  date_joined: true, last_login: true, created_at: true, updated_at: true,
}

// GET /api/users
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { page = '1', limit = '20' } = req.query as Record<string, string>
  const pageNum = parseInt(page)
  const limitNum = parseInt(limit)

  const [users, total] = await Promise.all([
    prisma.accounts_user.findMany({
      select: userSelect,
      orderBy: { date_joined: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.accounts_user.count(),
  ])

  success(res, { users, total, page: pageNum, limit: limitNum })
})

// GET /api/users/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const user = await prisma.accounts_user.findUnique({ where: { id: req.params.id as string }, select: userSelect })
  if (!user) { error(res, 'User not found', 404); return }
  success(res, user)
})

export default router
