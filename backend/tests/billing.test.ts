import mongoose from 'mongoose'
import { User } from '../src/models/User'
import { Plan } from '../src/models/Plan'
import Stripe from 'stripe'

// We mock stripe, returning the same singleton instance on every constructor call.
// Since the factory is hoisted, we define the singleton within the factory scope.
jest.mock('stripe', () => {
  const instance = {
    webhooks: {
      constructEvent: jest.fn(),
    },
    subscriptions: {
      retrieve: jest.fn().mockResolvedValue({
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
        status: 'active',
      }),
    },
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_mock123' }),
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({ url: 'https://checkout.stripe.com/mock' }),
      },
    },
  }
  return jest.fn().mockImplementation(() => instance)
})

// Now we can safely import billingService since Stripe has been mocked
import { billingService } from '../src/services/billingService'

describe('Billing Webhook', () => {
  let mockUser: any
  let stripeMock: any

  beforeAll(async () => {
    stripeMock = new Stripe('mock')

    // Seed plans into the memory database
    await Plan.deleteMany({})
    await Plan.insertMany([
      {
        name: 'Free',
        slug: 'free',
        monthlyPrice: 0,
        yearlyPrice: 0,
        features: { projects: 2, generationsPerMonth: 25, storageBytes: 500000 },
        creditCosts: { textGeneration: 1, imageConversion: 5, figmaConversion: 10, themeExport: 2 },
        isActive: true,
      },
      {
        name: 'Pro',
        slug: 'pro',
        monthlyPrice: 29,
        yearlyPrice: 23,
        features: { projects: 25, generationsPerMonth: 500, storageBytes: 1000000 },
        creditCosts: { textGeneration: 1, imageConversion: 5, figmaConversion: 10, themeExport: 2 },
        isActive: true,
      },
    ])
  })

  beforeEach(async () => {
    // Reset mock
    ;(stripeMock.webhooks.constructEvent as jest.Mock).mockReset()

    mockUser = await User.create({
      name: 'Billing User',
      email: 'billing@example.com',
      password: 'Test1234!',
      isEmailVerified: true,
      subscription: { plan: 'free', status: 'active', stripeCustomerId: 'cus_mock123' },
    })
  })

  it('updates plan to pro when metadata plan is pro', async () => {
    const mockEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_mock123',
          subscription: 'sub_mock123',
          metadata: {
            userId: String(mockUser._id),
            plan: 'pro',
          },
        },
      },
    }

    ;(stripeMock.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent)

    await billingService.handleWebhook(Buffer.from('payload'), 'sig')

    const updatedUser = await User.findById(mockUser._id)
    expect(updatedUser?.subscription.plan).toBe('pro')
    expect(updatedUser?.subscription.status).toBe('active')
  })

  it('defaults plan to free when metadata is missing plan', async () => {
    // Set user to 'pro' first to verify they get downgraded/updated to 'free'
    await User.findByIdAndUpdate(mockUser._id, { 'subscription.plan': 'pro' })

    const mockEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          customer: 'cus_mock123',
          subscription: 'sub_mock123',
          metadata: {
            userId: String(mockUser._id),
            // plan metadata is deliberately missing
          },
        },
      },
    }

    ;(stripeMock.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent)

    await billingService.handleWebhook(Buffer.from('payload'), 'sig')

    const updatedUser = await User.findById(mockUser._id)
    expect(updatedUser?.subscription.plan).toBe('free')
  })
})
