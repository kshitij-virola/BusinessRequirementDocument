'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import Badge from '@/components/ui/Badge'
import { useAdminPlans } from '@/lib/api/hooks'
import { adminApi } from '@/lib/api/admin'
import { mutate } from 'swr'
import { KEYS } from '@/lib/api/hooks'
import type { Plan } from '@/lib/api/types'

const EditPlanModal = ({ plan, onClose }: { plan: Plan; onClose: () => void }) => {
  const [monthlyPrice, setMonthlyPrice] = useState(String(plan.monthlyPrice))
  const [yearlyPrice, setYearlyPrice]   = useState(String(plan.yearlyPrice))
  const [isActive, setIsActive]         = useState(plan.isActive)
  const [isPopular, setIsPopular]       = useState(plan.isPopular)
  const [isPending, startTransition]    = useTransition()
  const [error, setError]               = useState('')

  const handleSave = async () => {
    startTransition(async () => {
      try {
        await adminApi.updatePlan(plan._id, {
          monthlyPrice: Number(monthlyPrice),
          yearlyPrice:  Number(yearlyPrice),
          isActive,
          isPopular,
        })
        await Promise.all([mutate(KEYS.adminPlans), mutate(KEYS.plans)])
        onClose()
      } catch {
        setError('Failed to save. Please try again.')
      }
    })
  }

  return (
    <Modal open onClose={onClose} title={`Edit ${plan.name} Plan`} size="sm">
      <div className="space-y-4">
        <Input label="Monthly Price ($)" type="number" value={monthlyPrice}
          onChange={(e) => setMonthlyPrice(e.target.value)} />
        <Input label="Yearly Price ($)" type="number" value={yearlyPrice}
          onChange={(e) => setYearlyPrice(e.target.value)} />
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-border bg-secondary text-violet-500 focus:ring-violet-500" />
          <span className="text-sm text-foreground/70">Plan active (visible to users)</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={isPopular} onChange={(e) => setIsPopular(e.target.checked)}
            className="h-4 w-4 rounded border-border bg-secondary text-violet-500 focus:ring-violet-500" />
          <span className="text-sm text-foreground/70">Mark as Most Popular</span>
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" loading={isPending} onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </Modal>
  )
}

const AdminPlansPage = () => {
  const { data: plans, isLoading } = useAdminPlans()
  const [editing, setEditing] = useState<Plan | null>(null)

  return (
    <div className="space-y-5 sm:space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Plan Management</h1>
          <p className="text-sm text-gray-400 mt-0.5">Configure pricing, features, and credit allocations</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] text-sm">
            <thead>
              <tr className="border-b border-border text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-left">Monthly</th>
                <th className="px-4 py-3 text-left">Yearly</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Generations/mo</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Projects</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left hidden sm:table-cell">Popular</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-6 rounded bg-border animate-pulse" /></td></tr>
                ))
              ) : (plans ?? []).map((plan) => {
                const f = plan.features as { projects?: number; generationsPerMonth?: number } | undefined
                return (
                  <tr key={plan._id} className="hover:bg-secondary transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground capitalize">{plan.name}</td>
                    <td className="px-4 py-3 text-gray-400">${plan.monthlyPrice}</td>
                    <td className="px-4 py-3 text-gray-400">${plan.yearlyPrice}</td>
                    <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">
                      {f?.generationsPerMonth != null ? f.generationsPerMonth.toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell">
                      {f?.projects === -1 || f?.projects == null ? 'Unlimited' : f.projects}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={plan.isActive ? 'success' : 'muted'}>{plan.isActive ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {plan.isPopular && <Badge variant="default">Most Popular</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(plan)}>Edit</Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!isLoading && (plans ?? []).length === 0 && (
          <p className="text-sm text-gray-500 text-center py-8">No plans found. Run migrations to seed plans.</p>
        )}
      </div>

      {editing && <EditPlanModal plan={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

export default AdminPlansPage;
