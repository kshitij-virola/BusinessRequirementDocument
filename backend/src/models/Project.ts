import mongoose, { Document, Schema } from 'mongoose'

export type ProjectStatus = 'active' | 'archived' | 'deleted'

export interface IProject extends Document {
  userId: mongoose.Types.ObjectId
  name: string
  description?: string
  status: ProjectStatus
  workspaceCount: number
  createdAt: Date
  updatedAt: Date
}

const projectSchema = new Schema<IProject>(
  {
    userId:         { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name:           { type: String, required: true, trim: true },
    description:    { type: String },
    status:         { type: String, enum: ['active', 'archived', 'deleted'], default: 'active' },
    workspaceCount: { type: Number, default: 0 },
  },
  { timestamps: true }
)

projectSchema.index({ userId: 1, status: 1 })

export const Project = mongoose.model<IProject>('Project', projectSchema)
