import { Router, Request, Response } from 'express'
import { billingService } from '../services/billingService'
import { authenticate, AuthRequest } from '../middleware/auth'
import { User } from '../models/User'
import { Plan } from '../models/Plan'
import { success, error } from '../utils/apiResponse'
import { env } from '../config/env'

const router = Router()

// GET /api/billing/plans — public list of active plans
router.get('/plans', async (_req: Request, res: Response): Promise<void> => {
  const plans = await Plan.find({ isActive: true }).sort({ monthlyPrice: 1 })
  success(res, plans)
})

// POST /api/billing/checkout — create Stripe checkout session
router.post('/checkout', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const { priceId, billing = 'monthly' } = req.body as { priceId?: string; billing?: 'monthly' | 'yearly' }
  const userId = req.user!.userId

  const user = await User.findById(userId)
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
  const user = await User.findById(req.user!.userId)
  if (!user?.subscription.stripeCustomerId) { error(res, 'No Stripe customer found', 400); return }
  const url = await billingService.createPortalSession(
    user.subscription.stripeCustomerId,
    `${env.clientUrl}/dashboard/billing`
  )
  success(res, { url })
})

// POST /api/billing/webhook — Stripe webhook handler
router.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string
  try {
    await billingService.handleWebhook(req.body as Buffer, sig)
    res.json({ received: true })
  } catch (err) {
    res.status(400).json({ error: String(err) })
  }
})

export default router
