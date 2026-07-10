import Stripe from 'stripe'
import { env } from '../config/env'
import { prisma } from '../config/db'
import { STATIC_PLAN_LIMITS, SubscriptionPlan } from './planLimits'
import { creditService } from './creditService'
import { logger } from '../utils/logger'

// Falls back to a placeholder key so the module can load without Stripe configured;
// actual API calls will fail naturally (auth error) only when a billing route is hit.
const stripe = new Stripe(env.stripe.secretKey || 'sk_test_not_configured')

export const billingService = {
  async createCustomer(userId: string, email: string, name: string): Promise<string> {
    const customer = await stripe.customers.create({ email, name, metadata: { userId } })
    await prisma.trooUser.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } })
    return customer.id
  },

  async createCheckoutSession(userId: string, priceId: string, successUrl: string, cancelUrl: string): Promise<string> {
    const user = await prisma.trooUser.findUnique({ where: { id: userId } })
    if (!user) throw new Error('User not found')

    let customerId = user.stripeCustomerId
    if (!customerId) customerId = await billingService.createCustomer(userId, user.email, user.name)

    const planDoc = await prisma.trooPlan.findFirst({
      where: { OR: [{ stripePriceIdMonthly: priceId }, { stripePriceIdYearly: priceId }] },
    })
    let planSlug: SubscriptionPlan = 'free'
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
        const plan = ((obj.metadata as Record<string, string>)?.plan ?? 'free') as SubscriptionPlan
        const subId = obj.subscription as string

        const planDoc = await prisma.trooPlan.findUnique({ where: { slug: plan } })
        const credits = planDoc ? planDoc.featuresGenerationsPerMonth : STATIC_PLAN_LIMITS[plan].credits
        const storageBytes = planDoc ? Number(planDoc.featuresStorageBytes) : STATIC_PLAN_LIMITS[plan].storageBytes

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

        await prisma.trooUser.update({
          where: { id: userId },
          data: {
            subscriptionPlan: plan,
            subscriptionStatus: status as any,
            stripeSubscriptionId: subId,
            currentPeriodEnd,
            creditsRemaining: credits,
            storageLimitBytes: storageBytes,
          },
        })
        await prisma.trooAuditLog.create({ data: { userId, actor: 'stripe', actorRole: 'system', action: 'subscription.create', entityId: userId, entityType: 'User', metadata: { plan } } })
        break
      }
      case 'invoice.payment_failed': {
        const customerId = obj.customer as string
        const user = await prisma.trooUser.findFirst({ where: { stripeCustomerId: customerId } })
        if (user) {
          await prisma.trooUser.update({ where: { id: user.id }, data: { subscriptionStatus: 'past_due' } })
          await prisma.trooAuditLog.create({
            data: {
              userId: user.id, actor: 'stripe', actorRole: 'system', action: 'payment.failed',
              entityId: user.id, entityType: 'User',
              metadata: { amountCents: obj.amount_due as number | undefined ?? 0, currency: obj.currency as string ?? 'usd', plan: user.subscriptionPlan },
            },
          })
        }
        break
      }
      case 'customer.subscription.deleted': {
        const subId = obj.id as string
        const user = await prisma.trooUser.findFirst({ where: { stripeSubscriptionId: subId } })
        if (user) {
          const planDoc = await prisma.trooPlan.findUnique({ where: { slug: 'free' } })
          const credits = planDoc ? planDoc.featuresGenerationsPerMonth : STATIC_PLAN_LIMITS.free.credits
          const storageBytes = planDoc ? Number(planDoc.featuresStorageBytes) : STATIC_PLAN_LIMITS.free.storageBytes

          await prisma.trooUser.update({
            where: { id: user.id },
            data: {
              subscriptionPlan: 'free',
              subscriptionStatus: 'canceled',
              creditsRemaining: credits,
              storageLimitBytes: storageBytes,
            },
          })
          await prisma.trooAuditLog.create({ data: { userId: user.id, actor: 'stripe', actorRole: 'system', action: 'subscription.cancel', entityId: user.id, entityType: 'User' } })
        }
        break
      }
      case 'invoice.payment_succeeded': {
        const customerId = obj.customer as string
        const user = await prisma.trooUser.findFirst({ where: { stripeCustomerId: customerId } })
        if (user) {
          const plan = user.subscriptionPlan
          const planDoc = await prisma.trooPlan.findUnique({ where: { slug: plan } })
          const credits = planDoc ? planDoc.featuresGenerationsPerMonth : STATIC_PLAN_LIMITS[plan].credits

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

          await creditService.reset(user.id, credits)
          await prisma.trooUser.update({
            where: { id: user.id },
            data: { currentPeriodEnd, subscriptionStatus: 'active' },
          })
          await prisma.trooAuditLog.create({
            data: {
              userId: user.id, actor: 'stripe', actorRole: 'system', action: 'payment.success',
              entityId: user.id, entityType: 'User',
              metadata: { amountCents: obj.amount_paid as number | undefined ?? 0, currency: obj.currency as string ?? 'usd', plan },
            },
          })
        }
        break
      }
    }

    logger.debug(`Stripe webhook handled: ${event.type}`)
  },
}
