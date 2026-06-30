import mongoose, { Document, Schema } from 'mongoose'

export type Framework = 'react' | 'vue' | 'angular' | 'html' | 'wordpress'
export type WorkspaceStatus = 'active' | 'archived' | 'deleted'

export interface IWorkspace extends Document {
  userId: mongoose.Types.ObjectId
  projectId?: mongoose.Types.ObjectId
  name: string
  framework: Framework
  status: WorkspaceStatus
  description?: string
  currentVersion: number
  totalGenerations: number
  createdAt: Date
  updatedAt: Date
}

const workspaceSchema = new Schema<IWorkspace>(
  {
    userId:            { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    projectId:         { type: Schema.Types.ObjectId, ref: 'Project', index: true },
    name:              { type: String, required: true, trim: true },
    framework:         { type: String, enum: ['react', 'vue', 'angular', 'html', 'wordpress'], required: true },
    status:            { type: String, enum: ['active', 'archived', 'deleted'], default: 'active' },
    description:       { type: String },
    currentVersion:    { type: Number, default: 0 },
    totalGenerations:  { type: Number, default: 0 },
  },
  { timestamps: true }
)

workspaceSchema.index({ userId: 1, status: 1 })

export const Workspace = mongoose.model<IWorkspace>('Workspace', workspaceSchema)
