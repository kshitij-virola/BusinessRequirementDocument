'use client'
import { useState, useEffect, useRef, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { usePlatformSettings } from '@/lib/api/hooks'
import { adminApi } from '@/lib/api/admin'
import { mutate } from 'swr'
import { KEYS } from '@/lib/api/hooks'

const AdminSettingsPage = () => {
  const { data, isLoading } = usePlatformSettings()
  const [platformName, setPlatformName]       = useState('')
  const [supportEmail, setSupportEmail]       = useState('')
  const [yearlyDiscount, setYearlyDiscount]   = useState('20')
  const [saveMsg, setSaveMsg]                 = useState<Record<string, string>>({})
  const [isPending, startTransition]          = useTransition()
  const initialized = useRef(false)

  useEffect(() => {
    if (data && !initialized.current) {
      setPlatformName(String(data['platform.name'] ?? 'TROO AI'))
      setSupportEmail(String(data['platform.supportEmail'] ?? 'support@trooai.com'))
      setYearlyDiscount(String(data['platform.yearlyDiscount'] ?? 20))
      initialized.current = true
    }
  }, [data])

  const flash = (section: string, msg: string) => {
    setSaveMsg((prev) => ({ ...prev, [section]: msg }))
    setTimeout(() => setSaveMsg((prev) => ({ ...prev, [section]: '' })), 3000)
  }

  const saveGeneral = () => {
    startTransition(async () => {
      await adminApi.savePlatformSettings({
        'platform.name':         platformName,
        'platform.supportEmail': supportEmail,
      })
      await mutate(KEYS.adminPlatformSettings)
      flash('general', 'Saved')
    })
  }

  const saveDiscount = () => {
    startTransition(async () => {
      await adminApi.savePlatformSettings({ 'platform.yearlyDiscount': Number(yearlyDiscount) })
      await mutate(KEYS.adminPlatformSettings)
      flash('discount', 'Saved')
    })
  }

  if (isLoading) (
      <div className="space-y-6 p-4 sm:p-6 max-w-2xl animate-pulse">
        <div className="h-8 w-48 rounded-lg bg-secondary" />
        <div className="h-40 rounded-xl bg-secondary" />
        <div className="h-40 rounded-xl bg-secondary" />
      </div>
    )

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-2xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Platform Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Configure global platform settings and billing</p>
      </div>

      {/* General */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">General</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Platform Name" value={platformName}
            onChange={(e) => setPlatformName(e.target.value)} />
          <Input label="Support Email" type="email" value={supportEmail}
            onChange={(e) => setSupportEmail(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <Button loading={isPending} onClick={saveGeneral}>Save</Button>
          {saveMsg.general && <span className="text-xs text-emerald-400">{saveMsg.general}</span>}
        </div>
      </div>

      {/* Stripe billing keys — managed via environment variables */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Stripe Billing</h2>
        <p className="text-sm text-gray-500">
          Stripe keys are managed via environment variables (<code className="text-gray-400">STRIPE_SECRET_KEY</code>,{' '}
          <code className="text-gray-400">STRIPE_WEBHOOK_SECRET</code>) and are not stored in the database.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Stripe Publishable Key" value={process.env.NEXT_PUBLIC_STRIPE_KEY ?? ''} readOnly
            placeholder="Set NEXT_PUBLIC_STRIPE_KEY in .env" className="opacity-60" />
        </div>
      </div>

      {/* Yearly discount */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Yearly Discount</h2>
        <div className="flex items-center gap-3">
          <Input label="Discount (%)" type="number" value={yearlyDiscount}
            onChange={(e) => setYearlyDiscount(e.target.value)} className="max-w-[120px]" />
          <p className="text-sm text-gray-400 mt-5">applied when user selects yearly billing</p>
        </div>
        <div className="flex items-center gap-3">
          <Button loading={isPending} onClick={saveDiscount}>Save</Button>
          {saveMsg.discount && <span className="text-xs text-emerald-400">{saveMsg.discount}</span>}
        </div>
      </div>
    </div>
  )
}

export default AdminSettingsPage;
