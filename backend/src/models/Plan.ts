import mongoose, { Document, Schema } from 'mongoose'

export interface IPlan extends Document {
  name: string
  slug: string // 'free' | 'pro' | 'agency'
  monthlyPrice: number
  yearlyPrice: number
  stripePriceIdMonthly?: string
  stripePriceIdYearly?: string
  features: {
    projects: number
    generationsPerMonth: number
    storageBytes: number
    downloadsPerMonth: number | null
    frameworks: string[]
    figmaConversion: boolean
    imageConversion: boolean
    teamMembers: number
    apiAccess: boolean
    priorityQueue: boolean
  }
  creditCosts: {
    textGeneration: number
    imageConversion: number
    figmaConversion: number
    themeExport: number
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const planSchema = new Schema<IPlan>(
  {
    name:  { type: String, required: true },
    slug:  { type: String, enum: ['free', 'pro', 'agency'], required: true, unique: true },
    monthlyPrice: { type: Number, required: true },
    yearlyPrice:  { type: Number, required: true },
    stripePriceIdMonthly: { type: String },
    stripePriceIdYearly:  { type: String },
    features: {
      projects:            { type: Number, required: true },
      generationsPerMonth: { type: Number, required: true },
      storageBytes:        { type: Number, required: true },
      downloadsPerMonth:   { type: Number, default: null },
      frameworks:          [{ type: String }],
      figmaConversion:     { type: Boolean, default: false },
      imageConversion:     { type: Boolean, default: false },
      teamMembers:         { type: Number, default: 1 },
      apiAccess:           { type: Boolean, default: false },
      priorityQueue:       { type: Boolean, default: false },
    },
    creditCosts: {
      textGeneration:  { type: Number, default: 1  },
      imageConversion: { type: Number, default: 5  },
      figmaConversion: { type: Number, default: 10 },
      themeExport:     { type: Number, default: 2  },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

const emitPlanChanged = () => {
  mongoose.connection.emit('plan_changed')
}

planSchema.post('save', emitPlanChanged)
planSchema.post('updateOne', emitPlanChanged)
planSchema.post('updateMany', emitPlanChanged)
planSchema.post('findOneAndUpdate', emitPlanChanged)
planSchema.post('deleteOne', emitPlanChanged)
planSchema.post('deleteMany', emitPlanChanged)

export const Plan = mongoose.model<IPlan>('Plan', planSchema)
