import mongoose, { Document, Schema } from 'mongoose'
import bcrypt from 'bcryptjs'

export type UserRole = 'user' | 'admin' | 'superadmin'
export type SubscriptionPlan = 'free' | 'pro' | 'agency'

export interface IUser extends Document {
  name: string
  email: string
  password?: string
  role: UserRole
  avatar?: string
  isEmailVerified: boolean
  isSuspended: boolean
  oauthProvider?: 'google' | 'github' | 'microsoft'
  oauthId?: string
  subscription: {
    plan: SubscriptionPlan
    stripeCustomerId?: string
    stripeSubscriptionId?: string
    currentPeriodEnd?: Date
    status: 'active' | 'canceled' | 'past_due' | 'trialing'
  }
  trialEndsAt?: Date
  credits: {
    remaining: number
    used: number
    resetAt: Date
  }
  storage: {
    usedBytes: number
    limitBytes: number
  }
  permissions: string[]
  passwordResetToken?: string
  passwordResetExpires?: Date
  emailVerificationToken?: string
  createdAt: Date
  updatedAt: Date
  comparePassword(candidate: string): Promise<boolean>
  checkSubscription(): Promise<void>
}

const STATIC_PLAN_LIMITS: Record<SubscriptionPlan, { credits: number; storageBytes: number }> = {
  free:   { credits: 25,   storageBytes: 500 * 1024 * 1024   },
  pro:    { credits: 500,  storageBytes: 10  * 1024 * 1024 * 1024  },
  agency: { credits: 5000, storageBytes: 100 * 1024 * 1024 * 1024 },
}

let planLimitsCache: typeof STATIC_PLAN_LIMITS | null = null

export const loadPlanLimits = async (): Promise<void> => {
  try {
    const PlanModel = mongoose.model('Plan')
    const plans = await PlanModel.find({ isActive: true })
    const newLimits = { ...STATIC_PLAN_LIMITS }
    for (const plan of plans) {
      const slug = plan.slug as SubscriptionPlan
      if (newLimits[slug]) {
        newLimits[slug] = {
          credits: plan.features?.generationsPerMonth ?? STATIC_PLAN_LIMITS[slug].credits,
          storageBytes: plan.features?.storageBytes ?? STATIC_PLAN_LIMITS[slug].storageBytes,
        }
      }
    }
    planLimitsCache = newLimits
  } catch (err) {
    // Fail silently, falls back to static limits
  }
}

// Automatically load when connection is ready or established
if (mongoose.connection.readyState === 1) {
  loadPlanLimits().catch(() => {})
} else {
  mongoose.connection.on('connected', () => {
    loadPlanLimits().catch(() => {})
  })
}

// Listen to plan changes to refresh cache
mongoose.connection.on('plan_changed', () => {
  loadPlanLimits().catch(() => {})
})

const PLAN_LIMITS = {
  get free() {
    return planLimitsCache?.free ?? STATIC_PLAN_LIMITS.free
  },
  get pro() {
    return planLimitsCache?.pro ?? STATIC_PLAN_LIMITS.pro
  },
  get agency() {
    return planLimitsCache?.agency ?? STATIC_PLAN_LIMITS.agency
  }
}

const userSchema = new Schema<IUser>(
  {
    name:             { type: String, required: true, trim: true },
    email:            { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:         { type: String, select: false },
    role:             { type: String, enum: ['user', 'admin', 'superadmin'], default: 'user' },
    avatar:           { type: String },
    isEmailVerified:  { type: Boolean, default: false },
    isSuspended:      { type: Boolean, default: false },
    oauthProvider:    { type: String, enum: ['google', 'github', 'microsoft'] },
    oauthId:          { type: String },
    subscription: {
      plan:                 { type: String, enum: ['free', 'pro', 'agency'], default: 'free' },
      stripeCustomerId:     { type: String },
      stripeSubscriptionId: { type: String },
      currentPeriodEnd:     { type: Date },
      status:               { type: String, enum: ['active', 'canceled', 'past_due', 'trialing'], default: 'active' },
    },
    trialEndsAt: { type: Date },
    credits: {
      remaining: { type: Number, default: () => PLAN_LIMITS.free.credits },
      used:      { type: Number, default: 0  },
      resetAt:   { type: Date,   default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    },
    storage: {
      usedBytes:  { type: Number, default: 0 },
      limitBytes: { type: Number, default: () => PLAN_LIMITS.free.storageBytes },
    },
    permissions:          { type: [String], default: [] },
    passwordResetToken:   { type: String, select: false },
    passwordResetExpires: { type: Date,   select: false },
    emailVerificationToken: { type: String, select: false },
  },
  { timestamps: true }
)

userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return
  this.password = await bcrypt.hash(this.password, 12)
})

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  if (!this.password) return false
  return bcrypt.compare(candidate, this.password)
}

userSchema.methods.checkSubscription = async function (): Promise<void> {
  if (this.subscription.plan === 'free') return

  const now = new Date()
  const hasExpired = this.subscription.currentPeriodEnd && this.subscription.currentPeriodEnd < now
  const isInactive = !['active', 'trialing'].includes(this.subscription.status)

  if (hasExpired || isInactive) {
    this.subscription.plan = 'free'
    this.subscription.status = 'canceled'
    this.storage.limitBytes = PLAN_LIMITS.free.storageBytes || 500 * 1024 * 1024 // Reset to Free limit (500 MB)
    await this.save()
  }
}
// userSchema.index({ email: 1 })
userSchema.index({ 'subscription.stripeCustomerId': 1 })

export const User = mongoose.model<IUser>('User', userSchema)
export { PLAN_LIMITS }
