'use client'
import { useState, useEffect, useRef, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import { useAIConfig } from '@/lib/api/hooks'
import { adminApi } from '@/lib/api/admin'
import { mutate } from 'swr'
import { KEYS } from '@/lib/api/hooks'
import type { AIProvider, AIRateLimits, AICreditCosts } from '@/lib/api/types'

const DEFAULT_LIMITS: AIRateLimits = { maxTokensPerRequest: 4096, dailySpendLimitUsd: 50, maxConcurrentRequests: 10, timeoutSeconds: 60 }
const DEFAULT_COSTS: AICreditCosts = { textGeneration: 1, imageConversion: 5, figmaConversion: 10, themeExport: 2 }

const statusVariant: Record<string, 'success' | 'warning' | 'muted'> = {
  active: 'success', standby: 'warning', disabled: 'muted',
}

const AIConfigPage = () => {
  const { data, isLoading } = useAIConfig()
  const [providers, setProviders]       = useState<AIProvider[]>([])
  const [systemPrompt, setSystemPrompt] = useState('')
  const [rateLimits, setRateLimits]     = useState<AIRateLimits>(DEFAULT_LIMITS)
  const [creditCosts, setCreditCosts]   = useState<AICreditCosts>(DEFAULT_COSTS)
  const [saveMsg, setSaveMsg]           = useState<Record<string, string>>({})
  const [isPending, startTransition]    = useTransition()
  const initialized = useRef(false)

  useEffect(() => {
    if (data && !initialized.current) {
      setProviders(data['ai.providers'] ?? [])
      setSystemPrompt(data['ai.systemPrompt'] ?? '')
      setRateLimits(data['ai.rateLimits'] ?? DEFAULT_LIMITS)
      setCreditCosts(data['credits.costs'] ?? DEFAULT_COSTS)
      initialized.current = true
    }
  }, [data])

  const flash = (section: string, msg: string) => {
    setSaveMsg((prev) => ({ ...prev, [section]: msg }))
    setTimeout(() => setSaveMsg((prev) => ({ ...prev, [section]: '' })), 3000)
  }

  const toggleProvider = (id: string) => {
    setProviders((prev) =>
      prev.map((p) => {
        if (p.id === id) return { ...p, status: p.status === 'active' ? 'standby' : 'active' }
        if (p.status === 'active' && p.id !== id) return { ...p, status: 'standby' }
        return p
      })
    )
  }

  const saveProviders = () => {
    startTransition(async () => {
      await adminApi.saveAIConfig({ 'ai.providers': providers })
      await mutate(KEYS.adminAIConfig)
      flash('providers', 'Saved')
    })
  }

  const savePrompt = () => {
    startTransition(async () => {
      await adminApi.saveAIConfig({ 'ai.systemPrompt': systemPrompt })
      await mutate(KEYS.adminAIConfig)
      flash('prompt', 'Saved')
    })
  }

  const saveLimits = () => {
    startTransition(async () => {
      await adminApi.saveAIConfig({ 'ai.rateLimits': rateLimits, 'credits.costs': creditCosts })
      await mutate(KEYS.adminAIConfig)
      flash('limits', 'Saved')
    })
  }

  if (isLoading) (
      <div className="space-y-6 p-4 sm:p-6 max-w-4xl animate-pulse">
        <div className="h-8 w-56 rounded-lg bg-secondary" />
        <div className="h-48 rounded-xl bg-secondary" />
        <div className="h-36 rounded-xl bg-secondary" />
      </div>
    )

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-4xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">AI Model Configuration</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage LLM providers, prompt templates, and rate limits</p>
      </div>

      {/* LLM Providers */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">LLM Providers</h2>
          <div className="flex items-center gap-2">
            {saveMsg.providers && <span className="text-xs text-emerald-400">{saveMsg.providers}</span>}
            <Button size="sm" loading={isPending} onClick={saveProviders}>Save Providers</Button>
          </div>
        </div>
        <div className="divide-y divide-border">
          {providers.map((p) => (
            <div key={p.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-primary">
                  {p.name[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.model} &middot; ${p.costPer1kTokens} / 1k tokens</p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Badge variant={statusVariant[p.status]}>{p.status}</Badge>
                <Button
                  variant={p.status === 'active' ? 'secondary' : 'primary'}
                  size="sm"
                  loading={isPending}
                  onClick={() => toggleProvider(p.id)}
                >
                  {p.status === 'active' ? 'Deactivate' : 'Activate'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prompt Template */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">System Prompt Template</h2>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-300">Base prompt injected for all generations</label>
          <textarea
            rows={5}
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full resize-none rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button loading={isPending} onClick={savePrompt}>Save Template</Button>
          {saveMsg.prompt && <span className="text-xs text-emerald-400">{saveMsg.prompt}</span>}
        </div>
      </div>

      {/* Rate Limits & Credit Costs */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-5">
        <h2 className="text-sm font-semibold text-foreground">Rate Limits & Cost Controls</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Max tokens per request" type="number" value={rateLimits.maxTokensPerRequest}
            onChange={(e) => setRateLimits((r) => ({ ...r, maxTokensPerRequest: Number(e.target.value) }))} />
          <Input label="Daily AI spend limit ($)" type="number" value={rateLimits.dailySpendLimitUsd}
            onChange={(e) => setRateLimits((r) => ({ ...r, dailySpendLimitUsd: Number(e.target.value) }))} />
          <Input label="Max concurrent requests" type="number" value={rateLimits.maxConcurrentRequests}
            onChange={(e) => setRateLimits((r) => ({ ...r, maxConcurrentRequests: Number(e.target.value) }))} />
          <Input label="Request timeout (seconds)" type="number" value={rateLimits.timeoutSeconds}
            onChange={(e) => setRateLimits((r) => ({ ...r, timeoutSeconds: Number(e.target.value) }))} />
        </div>

        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Credit Costs per Action</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Text generation" type="number" value={creditCosts.textGeneration}
              onChange={(e) => setCreditCosts((c) => ({ ...c, textGeneration: Number(e.target.value) }))} />
            <Input label="Image conversion" type="number" value={creditCosts.imageConversion}
              onChange={(e) => setCreditCosts((c) => ({ ...c, imageConversion: Number(e.target.value) }))} />
            <Input label="Figma conversion" type="number" value={creditCosts.figmaConversion}
              onChange={(e) => setCreditCosts((c) => ({ ...c, figmaConversion: Number(e.target.value) }))} />
            <Input label="Theme export" type="number" value={creditCosts.themeExport}
              onChange={(e) => setCreditCosts((c) => ({ ...c, themeExport: Number(e.target.value) }))} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button loading={isPending} onClick={saveLimits}>Save Limits</Button>
          {saveMsg.limits && <span className="text-xs text-emerald-400">{saveMsg.limits}</span>}
        </div>
      </div>
    </div>
  )
}

export default AIConfigPage;
