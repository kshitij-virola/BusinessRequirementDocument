'use client'
import { useState, useEffect, useTransition } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { mutate } from 'swr'
import Badge from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useAdminUsers, useAdminAccounts, useMe, KEYS } from '@/lib/api/hooks'
import { adminApi } from '@/lib/api/admin'
import type { AdminAccount } from '@/lib/api/types'

// ── Shared ──────────────────────────────────────────────────────────────────

const USER_ROLE_LABELS: Record<string, string> = { user: 'User', admin: 'Admin', superadmin: 'Super Admin' }
const USER_ROLE_VARIANT: Record<string, 'default' | 'warning' | 'danger'> = {
  user: 'default', admin: 'warning', superadmin: 'danger',
}

const ADMIN_PERMISSIONS = [
  { key: 'manage_users',      label: 'Manage Users' },
  { key: 'manage_plans',      label: 'Manage Plans' },
  { key: 'manage_payments',   label: 'Manage Payments' },
  { key: 'view_analytics',    label: 'View Analytics' },
  { key: 'configure_ai',      label: 'Configure AI Settings' },
  { key: 'manage_moderation', label: 'Content Moderation' },
  { key: 'view_audit_logs',   label: 'View Audit Logs' },
  { key: 'manage_settings',   label: 'Platform Settings' },
]

const ADMIN_ROLE_VARIANT: Record<string, 'warning' | 'danger'> = {
  admin: 'warning',
  superadmin: 'danger',
}

const ADMIN_ROLE_LABEL: Record<string, string> = {
  admin: 'Admin',
  superadmin: 'Super Admin',
}

// ── Users tab ────────────────────────────────────────────────────────────────

const UsersTab = () => {
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const { data, isLoading } = useAdminUsers({ search: search || undefined, plan: planFilter || undefined })
  const { data: me } = useMe()
  const [isPending, startTransition] = useTransition()
  const isSuperAdmin = me?.role === 'superadmin'
  const users = data?.users?.filter((user) => user._id !== me?._id && user.role !== 'superadmin') ?? []

  const handleAction = (id: string, action: 'suspend' | 'activate' | 'reset') => {
    startTransition(async () => {
      if (action === 'suspend')  await adminApi.suspendUser(id)
      if (action === 'activate') await adminApi.activateUser(id)
      if (action === 'reset')    await adminApi.resetCredits(id)
      mutate(KEYS.adminUsers())
    })
  }

  const handleRoleChange = (id: string, role: 'user' | 'admin') => {
    startTransition(async () => {
      await adminApi.changeUserRole(id, role)
      mutate(KEYS.adminUsers())
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="flex-1 h-10 rounded-lg border border-border bg-secondary px-3 text-sm text-foreground placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="h-10 rounded-lg border border-border bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="agency">Agency</option>
        </select>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Plan</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Credits</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-6 rounded bg-secondary animate-pulse" /></td></tr>
                ))
              ) : users.map((user) => (
                <tr key={user._id} className="hover:bg-secondary transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{user.name}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell capitalize">{user.subscription.plan}</td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{user.credits.remaining.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {isSuperAdmin && user.role !== 'superadmin' ? (
                      <select
                        value={user.role}
                        disabled={isPending}
                        onChange={(e) => handleRoleChange(user._id, e.target.value as 'user' | 'admin')}
                        className="rounded-md border border-border bg-secondary px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-violet-500 disabled:opacity-50"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <Badge variant={USER_ROLE_VARIANT[user.role] ?? 'default'}>
                        {USER_ROLE_LABELS[user.role] ?? user.role}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={user.isSuspended ? 'danger' : 'success'}>{user.isSuspended ? 'suspended' : 'active'}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Button variant="ghost" size="sm" loading={isPending}
                        onClick={() => handleAction(user._id, user.isSuspended ? 'activate' : 'suspend')}>
                        {user.isSuspended ? 'Activate' : 'Suspend'}
                      </Button>
                      <Button variant="secondary" size="sm" loading={isPending}
                        onClick={() => handleAction(user._id, 'reset')}>
                        Reset Credits
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isLoading && users.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">No users found</p>
        )}
        <div className="px-4 py-3 border-t border-border">
          <p className="text-sm text-gray-500">Showing {users.length} of {data?.total ?? 0} users</p>
        </div>
      </div>
    </div>
  )
}

// ── Admin form modal ─────────────────────────────────────────────────────────

type AdminFormData = {
  name: string
  email: string
  password: string
  role: 'admin' | 'superadmin'
  permissions: string[]
}

const emptyAdminForm = (): AdminFormData => ({
  name: '', email: '', password: '', role: 'admin', permissions: [],
})

const formFromAccount = (a: AdminAccount): AdminFormData => ({
  name: a.name, email: a.email, password: '', role: a.role, permissions: [...(a.permissions ?? [])],
})

const AdminAccountModal = ({
  open, onClose, editing, onSaved,
}: {
  open: boolean
  onClose: () => void
  editing: AdminAccount | null
  onSaved: () => void
}) => {
  const [form, setForm] = useState<AdminFormData>(emptyAdminForm)
  const [errors, setErrors] = useState<Partial<Record<keyof AdminFormData, string>>>({})
  const [apiError, setApiError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isEdit = editing !== null

  useEffect(() => {
    if (!open) return
    setForm(editing ? formFromAccount(editing) : emptyAdminForm())
    setErrors({})
    setApiError(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?._id])

  const set = (field: keyof AdminFormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => ({ ...prev, [field]: undefined }))
    setApiError(null)
  }

  const togglePermission = (key: string) => {
    setForm(prev => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter(p => p !== key)
        : [...prev.permissions, key],
    }))
  }

  const validate = (): boolean => {
    const errs: Partial<Record<keyof AdminFormData, string>> = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!isEdit) {
      if (!form.email.trim()) errs.email = 'Email is required'
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email'
      if (!form.password)    errs.password = 'Password is required'
      else if (form.password.length < 8) errs.password = 'Minimum 8 characters'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return
    setApiError(null)
    startTransition(async () => {
      try {
        if (isEdit) {
          await adminApi.updateAdmin(editing._id, {
            name: form.name,
            role: form.role,
            permissions: form.permissions,
          })
        } else {
          await adminApi.createAdmin({
            name: form.name,
            email: form.email,
            password: form.password,
            role: form.role,
            permissions: form.permissions,
          })
        }
        await mutate(KEYS.adminAccounts)
        onSaved()
        onClose()
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? (err instanceof Error ? err.message : 'Something went wrong')
        setApiError(msg)
      }
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Admin User' : 'Create Admin User'}
      description={isEdit ? `Editing: ${editing?.email}` : 'Fill in the details for the new admin account'}
      size="md"
    >
      <div className="space-y-4">
        <Input
          label="Name"
          placeholder="Full name"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          error={errors.name}
          disabled={isPending}
        />

        {!isEdit && (
          <>
            <Input
              label="Email"
              type="email"
              placeholder="admin@example.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              error={errors.email}
              disabled={isPending}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Minimum 8 characters"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              error={errors.password}
              disabled={isPending}
            />
          </>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-foreground">Role</label>
          <select
            value={form.role}
            onChange={e => set('role', e.target.value)}
            disabled={isPending}
            className="h-10 w-full rounded-lg border border-border bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50"
          >
            <option value="admin">Admin</option>
            <option value="superadmin">Super Admin</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-foreground">Permissions</label>
          <div className="grid grid-cols-2 gap-2">
            {ADMIN_PERMISSIONS.map(({ key, label }) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 hover:border-violet-500 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={form.permissions.includes(key)}
                  onChange={() => togglePermission(key)}
                  disabled={isPending}
                  className="h-3.5 w-3.5 accent-violet-600"
                />
                <span className="text-xs text-foreground">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {apiError && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {apiError}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button size="sm" loading={isPending} onClick={handleSubmit}>
            {isEdit ? 'Save Changes' : 'Create Admin'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── Admins tab ───────────────────────────────────────────────────────────────

const AdminsTab = () => {
  const { data, isLoading } = useAdminAccounts()
  const admins = data?.admins ?? []
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AdminAccount | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const openCreate = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (a: AdminAccount) => { setEditing(a); setModalOpen(true) }

  const handleDelete = (id: string) => {
    setDeleteError(null)
    startTransition(async () => {
      try {
        await adminApi.deleteAdmin(id)
        await mutate(KEYS.adminAccounts)
        setConfirmDelete(null)
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? (err instanceof Error ? err.message : 'Delete failed')
        setDeleteError(msg)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Create Admin
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-border text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Permissions</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Created</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-4 py-3">
                        <div className="h-6 rounded bg-secondary animate-pulse" />
                      </td>
                    </tr>
                  ))
                : admins.map(admin => (
                    <tr key={admin._id} className="hover:bg-secondary transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{admin.name}</p>
                        <p className="text-xs text-gray-500">{admin.email}</p>
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant={ADMIN_ROLE_VARIANT[admin.role] ?? 'default'}>
                          {ADMIN_ROLE_LABEL[admin.role] ?? admin.role}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 hidden md:table-cell">
                        {(admin.permissions ?? []).length === 0 ? (
                          <span className="text-xs text-gray-500">None</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {(admin.permissions ?? []).map(p => {
                              const label = ADMIN_PERMISSIONS.find(x => x.key === p)?.label ?? p
                              return (
                                <span key={p} className="rounded-md bg-secondary border border-border px-1.5 py-0.5 text-xs text-gray-300">
                                  {label}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-gray-400 text-xs hidden sm:table-cell">
                        {new Date(admin.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-3">
                        {confirmDelete === admin._id ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-400">Delete?</span>
                            <Button variant="danger" size="sm" loading={isPending} onClick={() => handleDelete(admin._id)}>
                              Yes
                            </Button>
                            <Button variant="secondary" size="sm" disabled={isPending} onClick={() => setConfirmDelete(null)}>
                              No
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(admin)}>
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(admin._id)}>
                              <Trash2 className="h-3.5 w-3.5 text-red-400" />
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!isLoading && admins.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-500">No admin users yet</p>
        )}

        {deleteError && (
          <div className="border-t border-border px-4 py-3">
            <p className="text-xs text-red-400">{deleteError}</p>
          </div>
        )}

        <div className="border-t border-border px-4 py-3">
          <p className="text-sm text-gray-500">
            {data?.total ?? 0} admin {(data?.total ?? 0) === 1 ? 'user' : 'users'}
          </p>
        </div>
      </div>

      <AdminAccountModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
        onSaved={() => setEditing(null)}
      />
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'users' | 'admins'

const ManageUsersPage = () => {
  const [tab, setTab] = useState<Tab>('users')
  const { data: me } = useMe()
  const isSuperAdmin = me?.role === 'superadmin'

  return (
    <div className="space-y-5 sm:space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">User Management</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage platform users {isSuperAdmin ? 'and administrator ' : ''}accounts</p>
      </div>

      {isSuperAdmin && (
        <div className="flex border-b border-border">
          {(["users", "admins"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px capitalize ${
                tab === t
                  ? "border-violet-500 text-violet-400"
                  : "border-transparent text-gray-400 hover:text-foreground"
              }`}
            >
              {t === "users" ? "Platform Users" : "Admin Users"}
            </button>
          ))}
        </div>
      )}

      {tab === 'users' ? <UsersTab /> : <AdminsTab />}
    </div>
  )
}

export default ManageUsersPage
