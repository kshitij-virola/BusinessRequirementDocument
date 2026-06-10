import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import { User } from '../../models/User'
import { AuditLog } from '../../models/AuditLog'
import { authenticate, AuthRequest } from '../../middleware/auth'
import { requireSuperAdmin } from '../../middleware/rbac'
import { success, created, error } from '../../utils/apiResponse'

const router = Router()
router.use(authenticate, requireSuperAdmin)

const ADMIN_SELECT = '-password -passwordResetToken -passwordResetExpires -emailVerificationToken'

const VALID_PERMISSIONS = [
  'manage_users',
  'manage_plans',
  'manage_payments',
  'view_analytics',
  'configure_ai',
  'manage_moderation',
  'view_audit_logs',
  'manage_settings',
]

// GET /api/admin/admins
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  const [admins, total] = await Promise.all([
    User.find({ role: { $in: ['admin', 'superadmin'] } })
      .sort({ createdAt: -1 })
      .select(ADMIN_SELECT),
    User.countDocuments({ role: { $in: ['admin', 'superadmin'] } }),
  ])
  success(res, { admins, total })
})

// POST /api/admin/admins
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, email, password, role, permissions = [] } = req.body as {
    name?: string
    email?: string
    password?: string
    role?: string
    permissions?: string[]
  }

  if (!name?.trim())     { error(res, 'Name is required');     return }
  if (!email?.trim())    { error(res, 'Email is required');    return }
  if (!password)         { error(res, 'Password is required'); return }
  if (password.length < 8) { error(res, 'Password must be at least 8 characters'); return }
  if (!['admin', 'superadmin'].includes(role ?? '')) {
    error(res, 'Role must be "admin" or "superadmin"')
    return
  }

  const invalidPerms = (permissions).filter(p => !VALID_PERMISSIONS.includes(p))
  if (invalidPerms.length) {
    error(res, `Invalid permissions: ${invalidPerms.join(', ')}`)
    return
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() })
  if (existing) { error(res, 'Email already in use'); return }

  const hashed = await bcrypt.hash(password, 12)
  const admin = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: hashed,
    role: role as 'admin' | 'superadmin',
    permissions,
    isEmailVerified: true,
  })

  await AuditLog.create({
    userId:    req.user!.userId,
    actor:     req.user!.email,
    actorRole: req.user!.role,
    action:    'admin.create_admin',
    entityId:  String(admin._id),
    entityType: 'User',
    metadata:  { role, permissions },
  })

  const result = await User.findById(admin._id).select(ADMIN_SELECT)
  created(res, result, 'Admin user created')
})

// PATCH /api/admin/admins/:id
router.patch('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id)

  if (id === req.user!.userId) {
    error(res, 'Cannot modify your own admin account here')
    return
  }

  const { name, role, permissions } = req.body as {
    name?: string
    role?: string
    permissions?: string[]
  }

  const updates: Record<string, unknown> = {}

  if (name !== undefined) {
    if (!name.trim()) { error(res, 'Name cannot be empty'); return }
    updates.name = name.trim()
  }

  if (role !== undefined) {
    if (!['admin', 'superadmin'].includes(role)) {
      error(res, 'Role must be "admin" or "superadmin"')
      return
    }
    updates.role = role
  }

  if (permissions !== undefined) {
    const invalidPerms = permissions.filter(p => !VALID_PERMISSIONS.includes(p))
    if (invalidPerms.length) {
      error(res, `Invalid permissions: ${invalidPerms.join(', ')}`)
      return
    }
    updates.permissions = permissions
  }

  const admin = await User.findOneAndUpdate(
    { _id: id, role: { $in: ['admin', 'superadmin'] } },
    { $set: updates },
    { new: true }
  ).select(ADMIN_SELECT)

  if (!admin) { error(res, 'Admin user not found', 404); return }

  await AuditLog.create({
    userId:    req.user!.userId,
    actor:     req.user!.email,
    actorRole: req.user!.role,
    action:    'admin.update_admin',
    entityId:  id,
    entityType: 'User',
    metadata:  updates,
  })

  success(res, admin, 'Admin user updated')
})

// DELETE /api/admin/admins/:id
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const id = String(req.params.id)

  if (id === req.user!.userId) {
    error(res, 'Cannot delete your own account')
    return
  }

  const admin = await User.findOneAndDelete({ _id: id, role: { $in: ['admin', 'superadmin'] } })
  if (!admin) { error(res, 'Admin user not found', 404); return }

  await AuditLog.create({
    userId:    req.user!.userId,
    actor:     req.user!.email,
    actorRole: req.user!.role,
    action:    'admin.delete_admin',
    entityId:  id,
    entityType: 'User',
    metadata:  { name: admin.name, email: admin.email, role: admin.role },
  })

  success(res, null, 'Admin user deleted')
})

export default router
