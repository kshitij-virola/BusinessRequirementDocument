import Stripe from 'stripe'
import { env } from '../config/env'
import { User, PLAN_LIMITS } from '../models/User'
import { AuditLog } from '../models/AuditLog'
import { creditService } from './creditService'
import { logger } from '../utils/logger'

const stripe = new Stripe(env.stripe.secretKey)

export const billingService = {
  async createCustomer(userId: string, email: string, name: string): Promise<string> {
    const customer = await stripe.customers.create({ email, name, metadata: { userId } })
    await User.findByIdAndUpdate(userId, { 'subscription.stripeCustomerId': customer.id })
    return customer.id
  },

  async createCheckoutSession(userId: string, priceId: string, successUrl: string, cancelUrl: string): Promise<string> {
    const user = await User.findById(userId)
    if (!user) throw new Error('User not found')

    let customerId = user.subscription.stripeCustomerId
    if (!customerId) {
      customerId = await billingService.createCustomer(userId, user.email, user.name)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId },
    })

    return session.url ?? ''
  },

  async createPortalSession(customerId: string, returnUrl: string): Promise<string> {
    const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl })
    return session.url
  },

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    let event: ReturnType<typeof stripe.webhooks.constructEvent>
    try {
      event = stripe.webhooks.constructEvent(payload, signature, env.stripe.webhookSecret)
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err}`)
    }

    // Cast through unknown to avoid Stripe namespace version mismatches
    const obj = event.data.object as unknown as Record<string, unknown>

    switch (event.type) {
      case 'checkout.session.completed': {
        const userId = (obj.metadata as Record<string, string> | undefined)?.userId
        if (!userId) break
        const plan = ((obj.metadata as Record<string, string>)?.plan ?? 'pro') as 'pro' | 'agency'
        await User.findByIdAndUpdate(userId, {
          'subscription.plan': plan,
          'subscription.status': 'active',
          'subscription.stripeSubscriptionId': obj.subscription,
          'credits.remaining': PLAN_LIMITS[plan].credits,
          'storage.limitBytes': PLAN_LIMITS[plan].storageBytes,
        })
        await AuditLog.create({ userId, actor: 'stripe', actorRole: 'system', action: 'subscription.create', metadata: { plan } })
        break
      }
      case 'invoice.payment_failed': {
        const customerId = obj.customer as string
        const user = await User.findOne({ 'subscription.stripeCustomerId': customerId })
        if (user) {
          await User.findByIdAndUpdate(user._id, { 'subscription.status': 'past_due' })
          await AuditLog.create({ userId: user._id, actor: 'stripe', actorRole: 'system', action: 'payment.failed' })
        }
        break
      }
      case 'customer.subscription.deleted': {
        const subId = obj.id as string
        const user = await User.findOne({ 'subscription.stripeSubscriptionId': subId })
        if (user) {
          await User.findByIdAndUpdate(user._id, {
            'subscription.plan': 'free',
            'subscription.status': 'canceled',
            'credits.remaining': PLAN_LIMITS.free.credits,
            'storage.limitBytes': PLAN_LIMITS.free.storageBytes,
          })
          await AuditLog.create({ userId: user._id, actor: 'stripe', actorRole: 'system', action: 'subscription.cancel' })
        }
        break
      }
      case 'invoice.payment_succeeded': {
        const customerId = obj.customer as string
        const user = await User.findOne({ 'subscription.stripeCustomerId': customerId })
        if (user) {
          const plan = user.subscription.plan as 'free' | 'pro' | 'agency'
          await creditService.reset(String(user._id), PLAN_LIMITS[plan].credits)
          await AuditLog.create({ userId: user._id, actor: 'stripe', actorRole: 'system', action: 'payment.success' })
        }
        break
      }
    }

    logger.debug(`Stripe webhook handled: ${event.type}`)
  },
}
