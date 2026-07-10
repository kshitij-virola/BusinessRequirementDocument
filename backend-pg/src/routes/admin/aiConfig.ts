import { Router, Response } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../../config/db'
import { authenticate, AuthRequest } from '../../middleware/auth'
import { requireAdmin } from '../../middleware/rbac'
import { success } from '../../utils/apiResponse'

const router = Router()
router.use(authenticate, requireAdmin)

const AI_KEYS = [
  'ai.activeProvider',
  'ai.providers',
  'ai.systemPrompt',
  'ai.rateLimits',
  'credits.costs',
  'moderation.blockedPatterns',
]

const DEFAULTS: Record<string, unknown> = {
  'ai.activeProvider': 'openai',
  'ai.providers': [
    { id: 'openai',    name: 'OpenAI',    model: 'gpt-4o',            status: 'active',   costPer1kTokens: 0.005 },
    { id: 'anthropic', name: 'Anthropic', model: 'claude-sonnet-4-6', status: 'standby',  costPer1kTokens: 0.003 },
    { id: 'gemini',    name: 'Gemini',    model: 'gemini-1.5-pro',    status: 'disabled', costPer1kTokens: 0.002 },
  ],
  'ai.systemPrompt': 'You are TROO AI, an expert frontend developer. Generate production-ready, clean, and responsive code. Follow best practices for the target framework.',
  'ai.rateLimits': { maxTokensPerRequest: 4096, dailySpendLimitUsd: 50, maxConcurrentRequests: 10, timeoutSeconds: 60 },
  'credits.costs': { textGeneration: 1, imageConversion: 5, figmaConversion: 10, themeExport: 2 },
  'moderation.blockedPatterns': ['hack*', 'phishing*', 'malware*', 'exploit*'],
}

// GET /api/admin/ai-config
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  const configs = await prisma.trooConfig.findMany({ where: { key: { in: AI_KEYS } } })
  const result: Record<string, unknown> = { ...DEFAULTS }
  for (const c of configs) result[c.key] = c.value
  success(res, result)
})

// PUT /api/admin/ai-config
router.put('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const updates = req.body as Record<string, unknown>
  for (const [key, value] of Object.entries(updates)) {
    if (!AI_KEYS.includes(key)) continue
    await prisma.trooConfig.upsert({
      where: { key },
      create: { key, value: value as any },
      update: { value: value as any },
    })
  }
  await prisma.trooAuditLog.create({
    data: { userId: req.user!.userId, actor: req.user!.email, actorRole: req.user!.role, action: 'admin.update_ai_config', metadata: updates as Prisma.InputJsonValue },
  })
  success(res, null, 'AI config updated')
})

export default router
