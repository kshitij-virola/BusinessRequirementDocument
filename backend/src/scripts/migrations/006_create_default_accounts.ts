/**
 * Creates default Admin and User accounts for development / first-run setup.
 * The Super Admin account is created by migration 002.
 *
 * Credentials (change all passwords after first login):
 *
 *   Super Admin  admin@trooai.com        Admin@Troo2026!
 *   Admin        adminuser@trooai.com    AdminUser@2026!
 *   User         user@trooai.com         User@Troo2026!
 */

import { User } from '../../models/User'
import { AuditLog } from '../../models/AuditLog'
import type { MigrationModule } from '../migrate'

export const description = 'Create default Admin and User accounts'

const ADMIN_EMAIL    = process.env.DEFAULT_ADMIN_EMAIL    ?? 'adminuser@trooai.com'
const ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD ?? 'AdminUser@2026!'
const ADMIN_NAME     = process.env.DEFAULT_ADMIN_NAME     ?? 'Admin User'

const USER_EMAIL    = process.env.DEFAULT_USER_EMAIL    ?? 'user@trooai.com'
const USER_PASSWORD = process.env.DEFAULT_USER_PASSWORD ?? 'User@Troo2026!'
const USER_NAME     = process.env.DEFAULT_USER_NAME     ?? 'Test User'

export const up = async (): Promise<void> => {
  // ── Admin account ───────────────────────────────────────────────────────────
  const existingAdmin = await User.findOne({ email: ADMIN_EMAIL })
  if (existingAdmin) {
    console.log(`  → Admin user ${ADMIN_EMAIL} already exists — skipping`)
  } else {
    const admin = await User.create({
      name:            ADMIN_NAME,
      email:           ADMIN_EMAIL,
      password:        ADMIN_PASSWORD,
      role:            'admin',
      isEmailVerified: true,
      isSuspended:     false,
      subscription: { plan: 'agency', status: 'active' },
      credits: {
        remaining: 99999,
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
      actor:     'migration:006',
      actorRole: 'system',
      action:    'user.register',
      metadata:  { note: 'Default admin created by migration' },
    })
    console.log(`  → Created admin user: ${ADMIN_EMAIL}`)
  }

  // ── Regular user account ────────────────────────────────────────────────────
  const existingUser = await User.findOne({ email: USER_EMAIL })
  if (existingUser) {
    console.log(`  → User ${USER_EMAIL} already exists — skipping`)
  } else {
    const user = await User.create({
      name:            USER_NAME,
      email:           USER_EMAIL,
      password:        USER_PASSWORD,
      role:            'user',
      isEmailVerified: true,
      isSuspended:     false,
      subscription: { plan: 'free', status: 'active' },
      credits: {
        remaining: 25,
        used:      0,
        resetAt:   new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      storage: {
        usedBytes:  0,
        limitBytes: 500 * 1024 * 1024,
      },
    })
    await AuditLog.create({
      userId:    user._id,
      actor:     'migration:006',
      actorRole: 'system',
      action:    'user.register',
      metadata:  { note: 'Default test user created by migration' },
    })
    console.log(`  → Created user: ${USER_EMAIL}`)
  }

  console.log(``)
  console.log(`  Default login credentials:`)
  console.log(`    Super Admin  admin@trooai.com       Admin@Troo2026!`)
  console.log(`    Admin        adminuser@trooai.com   AdminUser@2026!`)
  console.log(`    User         user@trooai.com        User@Troo2026!`)
  console.log(`  ⚠  Change all passwords after first login!`)
}

export const down = async (): Promise<void> => {
  await User.findOneAndDelete({ email: ADMIN_EMAIL, role: 'admin' })
  await User.findOneAndDelete({ email: USER_EMAIL,  role: 'user'  })
  console.log('  → Removed default admin and user accounts')
}

const _: MigrationModule = { description, up, down }
export default _
