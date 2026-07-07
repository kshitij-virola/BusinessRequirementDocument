import mongoose, { Document, Schema } from 'mongoose'

export type AuditAction =
  | 'user.register' | 'user.login' | 'user.logout' | 'user.password_reset' | 'user.deactivate'
  | 'workspace.create' | 'workspace.rename' | 'workspace.archive' | 'workspace.delete'
  | 'project.create' | 'project.update' | 'project.archive' | 'project.delete'
  | 'generation.start' | 'generation.complete' | 'generation.fail' | 'theme.export'
  | 'credits.deduct' | 'credits.reset'
  | 'subscription.create' | 'subscription.upgrade' | 'subscription.cancel'
  | 'payment.success' | 'payment.failed' | 'payment.refund'
  | 'admin.suspend_user' | 'admin.activate_user' | 'admin.reset_credits'
  | 'admin.update_plan' | 'admin.update_ai_config'
  | 'admin.change_user_role' | 'admin.update_settings'
  | 'admin.create_admin' | 'admin.update_admin' | 'admin.delete_admin'

export interface IAuditLog extends Document {
  userId?: mongoose.Types.ObjectId
  actor: string
  actorRole: string
  action: AuditAction
  entityId?: string
  entityType?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    userId:     { type: Schema.Types.ObjectId, ref: 'User' },
    actor:      { type: String, required: true },
    actorRole:  { type: String, required: true },
    action:     { type: String, required: true },
    entityId:   { type: String },
    entityType: { type: String },
    metadata:   { type: Schema.Types.Mixed },
    ipAddress:  { type: String },
    userAgent:  { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

auditLogSchema.index({ userId: 1, createdAt: -1 })
auditLogSchema.index({ action: 1, createdAt: -1 })
auditLogSchema.index({ createdAt: -1 })

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema)
