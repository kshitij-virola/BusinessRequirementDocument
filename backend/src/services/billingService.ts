import Stripe from 'stripe'
import { env } from '../config/env'
import { User, PLAN_LIMITS } from '../models/User'
import { Plan } from '../models/Plan'
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
    if (!customerId) customerId = await billingService.createCustomer(userId, user.email, user.name)

    const planDoc = await Plan.findOne({
      $or: [
        { stripePriceIdMonthly: priceId },
        { stripePriceIdYearly: priceId }
      ]
    })
    let planSlug = 'free'
    if (planDoc) {
      planSlug = planDoc.slug
    } else if (priceId === env.stripe.proPriceId) {
      planSlug = 'pro'
    } else if (priceId === env.stripe.agencyPriceId) {
      planSlug = 'agency'
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId, plan: planSlug },
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
        const plan = ((obj.metadata as Record<string, string>)?.plan ?? 'free') as 'free' | 'pro' | 'agency'
        const subId = obj.subscription as string
        
        const planDoc = await Plan.findOne({ slug: plan })
        const credits = planDoc ? planDoc.features.generationsPerMonth : PLAN_LIMITS[plan].credits
        const storageBytes = planDoc ? planDoc.features.storageBytes : PLAN_LIMITS[plan].storageBytes

        let currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // fallback 30 days
        let status = 'active'
        if (subId) {
          try {
            const subscription = await stripe.subscriptions.retrieve(subId) as any
            currentPeriodEnd = new Date(subscription.current_period_end * 1000)
            status = subscription.status
          } catch (err: any) {
            logger.error(`Failed to fetch Stripe subscription on checkout: ${err.message}`)
          }
        }

        await User.findByIdAndUpdate(userId, {
          'subscription.plan': plan,
          'subscription.status': status,
          'subscription.stripeSubscriptionId': subId,
          'subscription.currentPeriodEnd': currentPeriodEnd,
          'credits.remaining': credits,
          'storage.limitBytes': storageBytes,
        })
        await AuditLog.create({ userId, actor: 'stripe', actorRole: 'system', action: 'subscription.create', entityId: String(userId), entityType: 'User', metadata: { plan } })
        break
      }
      case 'invoice.payment_failed': {
        const customerId = obj.customer as string
        const user = await User.findOne({ 'subscription.stripeCustomerId': customerId })
        if (user) {
          await User.findByIdAndUpdate(user._id, { 'subscription.status': 'past_due' })
          await AuditLog.create({
            userId: user._id, actor: 'stripe', actorRole: 'system', action: 'payment.failed',
            entityId: String(user._id), entityType: 'User',
            metadata: { amountCents: obj.amount_due as number | undefined ?? 0, currency: obj.currency as string ?? 'usd', plan: user.subscription.plan },
          })
        }
        break
      }
      case 'customer.subscription.deleted': {
        const subId = obj.id as string
        const user = await User.findOne({ 'subscription.stripeSubscriptionId': subId })
        if (user) {
          const planDoc = await Plan.findOne({ slug: 'free' })
          const credits = planDoc ? planDoc.features.generationsPerMonth : PLAN_LIMITS.free.credits
          const storageBytes = planDoc ? planDoc.features.storageBytes : PLAN_LIMITS.free.storageBytes

          await User.findByIdAndUpdate(user._id, {
            'subscription.plan': 'free',
            'subscription.status': 'canceled',
            'credits.remaining': credits,
            'storage.limitBytes': storageBytes,
          })
          await AuditLog.create({ userId: user._id, actor: 'stripe', actorRole: 'system', action: 'subscription.cancel', entityId: String(user._id), entityType: 'User' })
        }
        break
      }
      case 'invoice.payment_succeeded': {
        const customerId = obj.customer as string
        const user = await User.findOne({ 'subscription.stripeCustomerId': customerId })
        if (user) {
          const plan = user.subscription.plan as 'free' | 'pro' | 'agency'
          const planDoc = await Plan.findOne({ slug: plan })
          const credits = planDoc ? planDoc.features.generationsPerMonth : PLAN_LIMITS[plan].credits

          const subId = obj.subscription as string
          let currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // fallback 30 days
          if (subId) {
            try {
              const subscription = await stripe.subscriptions.retrieve(subId) as any
              currentPeriodEnd = new Date(subscription.current_period_end * 1000)
            } catch (err: any) {
              logger.error(`Failed to fetch Stripe subscription on invoice success: ${err.message}`)
            }
          }

          await creditService.reset(String(user._id), credits)
          await User.findByIdAndUpdate(user._id, {
            'subscription.currentPeriodEnd': currentPeriodEnd,
            'subscription.status': 'active',
          })
          await AuditLog.create({
            userId: user._id, actor: 'stripe', actorRole: 'system', action: 'payment.success',
            entityId: String(user._id), entityType: 'User',
            metadata: { amountCents: obj.amount_paid as number | undefined ?? 0, currency: obj.currency as string ?? 'usd', plan },
          })
        }
        break
      }
    }

    logger.debug(`Stripe webhook handled: ${event.type}`)
  },
}
