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
  oauthProvider?: 'google' | 'github'
  oauthId?: string
  subscription: {
    plan: SubscriptionPlan
    stripeCustomerId?: string
    stripeSubscriptionId?: string
    currentPeriodEnd?: Date
    status: 'active' | 'canceled' | 'past_due' | 'trialing'
  }
  credits: {
    remaining: number
    used: number
    resetAt: Date
  }
  storage: {
    usedBytes: number
    limitBytes: number
  }
  passwordResetToken?: string
  passwordResetExpires?: Date
  emailVerificationToken?: string
  createdAt: Date
  updatedAt: Date
  comparePassword(candidate: string): Promise<boolean>
}

const PLAN_LIMITS: Record<SubscriptionPlan, { credits: number; storageBytes: number }> = {
  free:   { credits: 25,   storageBytes: 500 * 1024 * 1024   },
  pro:    { credits: 500,  storageBytes: 10 * 1024 * 1024 * 1024  },
  agency: { credits: 5000, storageBytes: 100 * 1024 * 1024 * 1024 },
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
    oauthProvider:    { type: String, enum: ['google', 'github'] },
    oauthId:          { type: String },
    subscription: {
      plan:                 { type: String, enum: ['free', 'pro', 'agency'], default: 'free' },
      stripeCustomerId:     { type: String },
      stripeSubscriptionId: { type: String },
      currentPeriodEnd:     { type: Date },
      status:               { type: String, enum: ['active', 'canceled', 'past_due', 'trialing'], default: 'active' },
    },
    credits: {
      remaining: { type: Number, default: 25 },
      used:      { type: Number, default: 0  },
      resetAt:   { type: Date,   default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    },
    storage: {
      usedBytes:  { type: Number, default: 0 },
      limitBytes: { type: Number, default: PLAN_LIMITS.free.storageBytes },
    },
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

userSchema.index({ email: 1 })
userSchema.index({ 'subscription.stripeCustomerId': 1 })

export const User = mongoose.model<IUser>('User', userSchema)
export { PLAN_LIMITS }
