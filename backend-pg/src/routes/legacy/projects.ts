import { Router, Request, Response } from 'express'
import { prisma } from '../../config/db'
import { success, error } from '../../utils/apiResponse'

const router = Router()

const projectSelect = {
  id: true, name: true, tech_stack: true, status: true,
  created_at: true, updated_at: true, thread_id: true,
}

// GET /api/projects
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { status, page = '1', limit = '20' } = req.query as Record<string, string>
  const pageNum = parseInt(page)
  const limitNum = parseInt(limit)
  const where = status ? { status } : {}

  const [projects, total] = await Promise.all([
    prisma.projects_project.findMany({
      where,
      select: projectSelect,
      orderBy: { updated_at: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.projects_project.count({ where }),
  ])

  success(res, { projects, total, page: pageNum, limit: limitNum })
})

// GET /api/projects/:id
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const project = await prisma.projects_project.findUnique({ where: { id: req.params.id as string }, select: projectSelect })
  if (!project) { error(res, 'Project not found', 404); return }
  success(res, project)
})

// GET /api/projects/:id/files
router.get('/:id/files', async (req: Request, res: Response): Promise<void> => {
  const files = await prisma.projects_projectfile.findMany({
    where: { project_id: req.params.id as string },
    select: {
      id: true, path: true, file_type: true, version: true,
      is_binary: true, is_compressed: true, size_bytes: true,
      created_at: true, updated_at: true,
    },
    orderBy: { path: 'asc' },
  })

  success(res, files.map((f: (typeof files)[number]) => ({ ...f, size_bytes: f.size_bytes !== null ? Number(f.size_bytes) : null })))
})

export default router
