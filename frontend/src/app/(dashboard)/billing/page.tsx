'use client'
import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, FileText, ExternalLink, Zap, HardDrive, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Switch } from '@/components/ui/Switch'
import { cn } from '@/lib/utils'
import { usePlans, useDashboardStats, useMe } from '@/lib/api/hooks'
import { billingApi } from '@/lib/api/billing'
import type { PlanFeatures } from '@/lib/api/types'

const featureLabels = (f: PlanFeatures): string[] => {
  const labels: string[] = []
  labels.push(f.projects >= 999999 ? 'Unlimited Projects' : `${f.projects} Projects`)
  labels.push(`${f.generationsPerMonth.toLocaleString()} Generations/month`)
  const gb = f.storageBytes / 1024 ** 3
  labels.push(gb >= 1 ? `${gb} GB Storage` : `${Math.round(f.storageBytes / 1024 ** 2)} MB Storage`)
  labels.push(f.downloadsPerMonth === null ? 'Unlimited Downloads' : `${f.downloadsPerMonth} Downloads/month`)
  if (f.frameworks.length === 1 && f.frameworks[0] === 'html') labels.push('HTML Only')
  else if (f.frameworks.length > 1) labels.push('All Frameworks')
  if (f.figmaConversion) labels.push('Figma Conversion')
  if (f.imageConversion) labels.push('Image Conversion')
  if (f.teamMembers > 1) labels.push(`${f.teamMembers} Team Members`)
  if (f.apiAccess) labels.push('API Access')
  if (f.priorityQueue) labels.push('Priority Queue')
  return labels
}

const formatBytes = (bytes: number) => {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)} MB`
  return `${Math.round(bytes / 1024)} KB`
}

const formatDate = (iso?: string) => {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

const statusVariant = (status: string): 'success' | 'warning' | 'danger' | 'default' => {
  if (status === 'active') return 'success'
  if (status === 'trialing') return 'default'
  if (status === 'past_due' || status === 'unpaid') return 'danger'
  if (status === 'canceled') return 'warning'
  return 'default'
}

const UsageBar = ({ label, used, total, icon: Icon }: { label: string; used: number; total: number; icon: React.ElementType }) => {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
  const isHigh = pct >= 80
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted">
          <Icon className="h-3.5 w-3.5" />{label}
        </span>
        <span className={cn('font-medium', isHigh ? 'text-warning' : 'text-muted')}>
          {pct}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', isHigh ? 'bg-warning' : 'bg-primary')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted">{used.toLocaleString()} / {total.toLocaleString()} {label.toLowerCase()}</p>
    </div>
  )
}

const PLAN_ORDER = ['free', 'pro', 'agency']

const BillingPage = () => {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const { data: me } = useMe()
  const { data: plans, isLoading: plansLoading } = usePlans()
  const { data: stats } = useDashboardStats()

  const currentPlanSlug = me?.subscription.plan ?? stats?.subscriptionPlan ?? 'free'
  const subStatus = me?.subscription.status ?? stats?.subscriptionStatus ?? 'active'
  const renewalDate = formatDate(me?.subscription.currentPeriodEnd)
  const isPaidPlan = currentPlanSlug !== 'free'

  const generationsUsed = stats?.creditsUsed ?? 0
  const generationsLimit = plans?.find(p => p.slug === currentPlanSlug)?.features.generationsPerMonth ?? 0
  const storageUsed = stats?.storageUsedBytes ?? me?.storage?.usedBytes ?? 0
  const storageLimit = stats?.storageLimitBytes ?? me?.storage?.limitBytes ?? 0

  const currentPlanRank = PLAN_ORDER.indexOf(currentPlanSlug)

  const handleUpgrade = async (planId: string, priceIdMonthly?: string, priceIdYearly?: string) => {
    const priceId = billing === 'yearly' ? priceIdYearly : priceIdMonthly
    if (!priceId) return
    setLoadingPlanId(planId)
    try {
      const url = await billingApi.createCheckout(priceId, billing)
      window.location.href = url
    } catch {
      setLoadingPlanId(null)
    }
  }

  const handleManageSubscription = async () => {
    setPortalLoading(true)
    try {
      const url = await billingApi.openPortal()
      window.location.href = url
    } catch {
      setPortalLoading(false)
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Billing</h1>
          <p className="text-sm text-muted mt-0.5">Manage your subscription and usage</p>
        </div>
        <Link href="/billing/invoices">
          <Button variant="secondary" size="sm">
            <FileText className="h-4 w-4" />Invoice History
          </Button>
        </Link>
      </div>

      {/* Current plan card */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted uppercase tracking-wider font-medium">Current Plan</p>
            <p className="text-xl font-bold text-foreground">
              {currentPlanSlug.charAt(0).toUpperCase() + currentPlanSlug.slice(1)} Plan
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant(subStatus)}>
                {subStatus.charAt(0).toUpperCase() + subStatus.slice(1)}
              </Badge>
              {renewalDate && (
                <span className="text-xs text-muted">
                  {subStatus === 'canceled' ? 'Access until' : 'Renews'} {renewalDate}
                </span>
              )}
            </div>
          </div>
          {isPaidPlan && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleManageSubscription}
              loading={portalLoading}
            >
              <ExternalLink className="h-3.5 w-3.5" />Manage Subscription
            </Button>
          )}
        </div>

        {/* Usage bars */}
        <div className="grid gap-4 sm:grid-cols-2 pt-1 border-t border-border">
          {generationsLimit > 0 && (
            <UsageBar
              label="Generations"
              used={generationsUsed}
              total={generationsLimit}
              icon={Zap}
            />
          )}
          {storageLimit > 0 && (
            <UsageBar
              label={`Storage (${formatBytes(storageUsed)} / ${formatBytes(storageLimit)})`}
              used={storageUsed}
              total={storageLimit}
              icon={HardDrive}
            />
          )}
        </div>

        {subStatus === 'past_due' && (
          <div className="flex items-start gap-2 rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Your payment failed. Please update your payment method to keep your subscription active.</span>
          </div>
        )}
      </div>

      {/* Billing period toggle */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-3">
          <span className={cn('text-sm font-medium transition-colors select-none', billing === 'monthly' ? 'text-foreground' : 'text-muted')}>
            Monthly
          </span>
          <Switch
            checked={billing === 'yearly'}
            onChange={(on) => setBilling(on ? 'yearly' : 'monthly')}
            label="Billing period"
          />
          <span className={cn('text-sm font-medium transition-colors select-none', billing === 'yearly' ? 'text-foreground' : 'text-muted')}>
            Yearly
          </span>
          <span className="rounded-full bg-emerald-600/20 border border-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 select-none">
            Save 20%
          </span>
        </div>
      </div>

      {/* Pricing cards */}
      {plansLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 sm:p-6 h-80 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans?.map((plan, idx) => {
            const price = billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
            const isCurrent = plan.slug === currentPlanSlug
            const hasAnyPopular = plans.some(p => p.isPopular)
            const isPopular = plan.isPopular || (!hasAnyPopular && idx === 1)
            const planRank = PLAN_ORDER.indexOf(plan.slug)
            const isUpgrade = planRank > currentPlanRank
            const isDowngrade = planRank < currentPlanRank
            const labels = featureLabels(plan.features)
            const isFree = plan.monthlyPrice === 0

            let buttonLabel = `Upgrade to ${plan.name}`
            if (isCurrent) buttonLabel = 'Current Plan'
            else if (isFree) buttonLabel = 'Downgrade to Free'
            else if (isDowngrade) buttonLabel = `Switch to ${plan.name}`

            const canCheckout = !isCurrent && isUpgrade && (billing === 'yearly' ? !!plan.stripePriceIdYearly : !!plan.stripePriceIdMonthly)

            return (
              <div
                key={plan._id}
                className={cn(
                  'rounded-xl border p-5 sm:p-6 space-y-4 sm:space-y-5 flex flex-col',
                  isPopular ? 'border-primary bg-primary/5' : 'border-border bg-card',
                  isCurrent && 'ring-2 ring-primary/30'
                )}
              >

                <div>
                  <p className="font-semibold text-foreground">{plan.name}</p>
                  <div className="flex items-baseline gap-0.5 mt-1">
                    {isFree ? (
                      <span className="text-2xl sm:text-3xl font-bold text-foreground">Free</span>
                    ) : (
                      <>
                        <span className="text-2xl sm:text-3xl font-bold text-foreground">${price}</span>
                        <span className="text-muted text-sm">/mo</span>
                        {billing === 'yearly' && (
                          <span className="ml-2 text-xs line-through text-muted">${plan.monthlyPrice}</span>
                        )}
                      </>
                    )}
                  </div>
                  {billing === 'yearly' && !isFree && (
                    <p className="text-xs text-emerald-400 mt-0.5">Billed ${price * 12}/year</p>
                  )}
                </div>

                <ul className="space-y-2 flex-1">
                  {labels.map((label) => (
                    <li key={label} className="flex items-center gap-2 text-sm text-foreground/70">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />{label}
                    </li>
                  ))}
                </ul>

                {!isFree && (
                  <Button
                    variant={isCurrent ? 'secondary' : isPopular && isUpgrade ? 'primary' : 'outline'}
                    fullWidth
                    disabled={isCurrent || isDowngrade || !canCheckout}
                    loading={loadingPlanId === plan._id}
                    onClick={() => canCheckout && handleUpgrade(plan._id, plan.stripePriceIdMonthly, plan.stripePriceIdYearly)}
                  >
                    {buttonLabel}
                  </Button>
                )}

                {!isFree && isDowngrade && (
                  <p className="text-xs text-center text-muted">
                    Use &ldquo;Manage Subscription&rdquo; to downgrade
                  </p>
                )}

                {(isPopular || isCurrent) && (
                  <div className="flex items-center justify-center gap-1.5 pt-1">
                    {isPopular && <Badge>Most Popular</Badge>}
                    {isCurrent && <Badge variant="success">Your Plan</Badge>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default BillingPage
