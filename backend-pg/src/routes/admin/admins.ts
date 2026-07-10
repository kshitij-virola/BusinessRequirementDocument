import { Router, Response } from 'express'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { prisma } from '../../config/db'
import { authenticate, AuthRequest } from '../../middleware/auth'
import { requireSuperAdmin } from '../../middleware/rbac'
import { success, created, error } from '../../utils/apiResponse'

const router = Router()
router.use(authenticate, requireSuperAdmin)

const ADMIN_SELECT = {
  id: true, name: true, email: true, role: true, permissions: true, isSuspended: true,
  isEmailVerified: true, createdAt: true, updatedAt: true,
}

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
  const where: Prisma.TrooUserWhereInput = { role: { in: ['admin', 'superadmin'] } }
  const [admins, total] = await Promise.all([
    prisma.trooUser.findMany({ where, orderBy: { createdAt: 'desc' }, select: ADMIN_SELECT }),
    prisma.trooUser.count({ where }),
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

  const invalidPerms = permissions.filter((p) => !VALID_PERMISSIONS.includes(p))
  if (invalidPerms.length) {
    error(res, `Invalid permissions: ${invalidPerms.join(', ')}`)
    return
  }

  const existing = await prisma.trooUser.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (existing) { error(res, 'Email already in use'); return }

  const hashed = await bcrypt.hash(password, 12)
  const admin = await prisma.trooUser.create({
    data: {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      role: role as 'admin' | 'superadmin',
      permissions,
      isEmailVerified: true,
    },
    select: ADMIN_SELECT,
  })

  await prisma.trooAuditLog.create({
    data: { userId: req.user!.userId, actor: req.user!.email, actorRole: req.user!.role, action: 'admin.create_admin', entityId: admin.id, entityType: 'User', metadata: { role, permissions } },
  })

  created(res, admin, 'Admin user created')
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
    const invalidPerms = permissions.filter((p) => !VALID_PERMISSIONS.includes(p))
    if (invalidPerms.length) {
      error(res, `Invalid permissions: ${invalidPerms.join(', ')}`)
      return
    }
    updates.permissions = permissions
  }

  const existing = await prisma.trooUser.findFirst({ where: { id, role: { in: ['admin', 'superadmin'] } } })
  if (!existing) { error(res, 'Admin user not found', 404); return }

  const admin = await prisma.trooUser.update({ where: { id }, data: updates, select: ADMIN_SELECT })

  await prisma.trooAuditLog.create({
    data: { userId: req.user!.userId, actor: req.user!.email, actorRole: req.user!.role, action: 'admin.update_admin', entityId: id, entityType: 'User', metadata: updates as Prisma.InputJsonValue },
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

  const admin = await prisma.trooUser.findFirst({ where: { id, role: { in: ['admin', 'superadmin'] } } })
  if (!admin) { error(res, 'Admin user not found', 404); return }
  await prisma.trooUser.delete({ where: { id } })

  await prisma.trooAuditLog.create({
    data: {
      userId: req.user!.userId, actor: req.user!.email, actorRole: req.user!.role, action: 'admin.delete_admin', entityId: id, entityType: 'User',
      metadata: { name: admin.name, email: admin.email, role: admin.role },
    },
  })

  success(res, null, 'Admin user deleted')
})

export default router
