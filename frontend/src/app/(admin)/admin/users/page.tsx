'use client'
import { useState, useTransition } from 'react'
import Badge from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { useAdminUsers, useMe } from '@/lib/api/hooks'
import { adminApi } from '@/lib/api/admin'
import { mutate } from 'swr'
import { KEYS } from '@/lib/api/hooks'

const ROLE_LABELS: Record<string, string> = { user: 'User', admin: 'Admin', superadmin: 'Super Admin' }
const ROLE_VARIANT: Record<string, 'default' | 'warning' | 'danger'> = {
  user: 'default', admin: 'warning', superadmin: 'danger',
}

const AdminUsersPage = () => {
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const { data, isLoading } = useAdminUsers({ search: search || undefined, plan: planFilter || undefined })
  const { data: me } = useMe()
  const users = data?.users ?? []
  const [isPending, startTransition] = useTransition()
  const isSuperAdmin = me?.role === 'superadmin'

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
    <div className="space-y-5 sm:space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">User Management</h1>
        <p className="text-sm text-gray-400 mt-0.5">View and manage all platform users</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email..."
          className="flex-1 h-10 rounded-lg border border-border bg-secondary px-3 text-sm text-foreground placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500" />
        <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}
          className="h-10 rounded-lg border border-border bg-secondary px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500">
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
                      <Badge variant={ROLE_VARIANT[user.role] ?? 'default'}>
                        {ROLE_LABELS[user.role] ?? user.role}
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

export default AdminUsersPage;
