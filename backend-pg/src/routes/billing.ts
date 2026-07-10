import { Router, Request, Response } from 'express'
import { billingService } from '../services/billingService'
import { authenticate, AuthRequest } from '../middleware/auth'
import { prisma } from '../config/db'
import { success, error } from '../utils/apiResponse'
import { env } from '../config/env'

const router = Router()

// GET /api/billing/plans — public list of active plans
router.get('/plans', async (_req: Request, res: Response): Promise<void> => {
  const plans = await prisma.trooPlan.findMany({ where: { isActive: true }, orderBy: { monthlyPrice: 'asc' } })
  success(res, plans)
})

// POST /api/billing/checkout — create Stripe checkout session
router.post('/checkout', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { priceId, billing = 'monthly' } = req.body as { priceId?: string; billing?: 'monthly' | 'yearly' }
  const userId = req.user!.userId

  const user = await prisma.trooUser.findUnique({ where: { id: userId } })
  if (!user) { error(res, 'User not found', 404); return }

  const resolvedPriceId = priceId ??
    (billing === 'yearly' ? env.stripe.agencyPriceId : env.stripe.proPriceId)

  const url = await billingService.createCheckoutSession(
    userId,
    resolvedPriceId,
    `${env.clientUrl}/dashboard/billing?success=true`,
    `${env.clientUrl}/dashboard/billing?cancelled=true`,
  )
  success(res, { url })
})

// POST /api/billing/portal — open Stripe billing portal
router.post('/portal', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await prisma.trooUser.findUnique({ where: { id: req.user!.userId } })
  if (!user?.stripeCustomerId) { error(res, 'No Stripe customer found', 400); return }
  const url = await billingService.createPortalSession(user.stripeCustomerId, `${env.clientUrl}/dashboard/billing`)
  success(res, { url })
})

// POST /api/billing/webhook — Stripe webhook handler
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  // raw body is required for Stripe signature verification
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    if (typeof chunk === 'string') chunks.push(Buffer.from(chunk))
    else chunks.push(chunk)
  }
  const rawBody = Buffer.concat(chunks)

  const sig = req.headers['stripe-signature'] as string
  try {
    await billingService.handleWebhook(rawBody, sig)
    res.json({ received: true })
  } catch (err) {
    res.status(400).json({ error: String(err) })
  }
})

export default router
