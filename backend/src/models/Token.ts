import mongoose, { Document, Schema } from 'mongoose'

export interface IToken extends Document {
  userId: mongoose.Types.ObjectId
  token: string
  type: 'refresh' | 'email_verify' | 'password_reset'
  expiresAt: Date
  createdAt: Date
}

const tokenSchema = new Schema<IToken>(
  {
    userId:    { type: Schema.Types.ObjectId, ref: 'User', required: true },
    token:     { type: String, required: true },
    type:      { type: String, enum: ['refresh', 'email_verify', 'password_reset'], required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
)

tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
tokenSchema.index({ userId: 1, type: 1 })

export const Token = mongoose.model<IToken>('Token', tokenSchema)
