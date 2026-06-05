import { User } from '../../models/User'
import { AuditLog } from '../../models/AuditLog'
import type { MigrationModule } from '../migrate'

export const description = 'Create default super admin user'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@trooai.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Admin@Troo2026!'
const ADMIN_NAME = process.env.ADMIN_NAME ?? 'Super Admin'

export const up = async (): Promise<void> => {
  const existing = await User.findOne({ email: ADMIN_EMAIL })
  if (existing) {
    console.log(`  → Admin user ${ADMIN_EMAIL} already exists — skipping`)
    return
  }

  const admin = await User.create({
    name:             ADMIN_NAME,
    email:            ADMIN_EMAIL,
    password:         ADMIN_PASSWORD,
    role:             'superadmin',
    isEmailVerified:  true,
    isSuspended:      false,
    subscription: {
      plan:   'agency',
      status: 'active',
    },
    credits: {
      remaining: 999999,
      used:      0,
      resetAt:   new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    storage: {
      usedBytes:  0,
      limitBytes: 100 * 1024 * 1024 * 1024,
    },
  })

  await AuditLog.create({
    userId:    admin._id,
    actor:     'migration:002',
    actorRole: 'system',
    action:    'user.register',
    metadata:  { note: 'Initial super admin created by migration' },
  })

  console.log(`  → Created super admin: ${ADMIN_EMAIL}`)
  console.log(`  ⚠  IMPORTANT: Change the admin password immediately after first login!`)
}

export const down = async (): Promise<void> => {
  const deleted = await User.findOneAndDelete({ email: ADMIN_EMAIL, role: 'superadmin' })
  if (deleted) {
    console.log(`  → Removed admin user: ${ADMIN_EMAIL}`)
  }
}

const _: MigrationModule = { description, up, down }
export default _
