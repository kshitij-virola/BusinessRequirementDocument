import { Router, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../../config/db'
import { authenticate, AuthRequest } from '../../middleware/auth'
import { requireAdmin } from '../../middleware/rbac'
import { success } from '../../utils/apiResponse'

const router = Router()
router.use(authenticate, requireAdmin)

const SETTINGS_KEYS = ['platform.name', 'platform.supportEmail', 'platform.yearlyDiscount']

const DEFAULTS: Record<string, unknown> = {
  'platform.name':           'TROO AI',
  'platform.supportEmail':   'support@trooai.com',
  'platform.yearlyDiscount': 20,
}

// GET /api/admin/settings
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  const configs = await prisma.trooConfig.findMany({ where: { key: { in: SETTINGS_KEYS } } })
  const result: Record<string, unknown> = { ...DEFAULTS }
  for (const c of configs) result[c.key] = c.value
  success(res, result)
})

// PUT /api/admin/settings
router.put('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const updates = req.body as Record<string, unknown>
  for (const [key, value] of Object.entries(updates)) {
    if (!SETTINGS_KEYS.includes(key)) continue
    await prisma.trooConfig.upsert({
      where: { key },
      create: { key, value: value as any },
      update: { value: value as any },
    })
  }
  await prisma.trooAuditLog.create({
    data: { userId: req.user!.userId, actor: req.user!.email, actorRole: req.user!.role, action: 'admin.update_settings', metadata: updates as Prisma.InputJsonValue },
  })
  success(res, null, 'Settings updated')
})

export default router
