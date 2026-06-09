import mongoose, { Document, Schema } from 'mongoose'

export interface IConfig extends Document {
  key: string
  value: unknown
  updatedAt: Date
}

const configSchema = new Schema<IConfig>(
  {
    key:   { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
)

export const Config =
  (mongoose.models['Config'] as mongoose.Model<IConfig> | undefined) ??
  mongoose.model<IConfig>('Config', configSchema)
