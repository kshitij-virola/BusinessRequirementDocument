'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Cookie, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'

const STORAGE_KEY = 'troo_cookie_consent'

export const CookieConsent = () => {
  const [visible, setVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [preferences, setPreferences] = useState({ analytics: true, marketing: false })

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) setVisible(true)
  }, [])

  const acceptAll = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ analytics: true, marketing: true, necessary: true }))
    setVisible(false)
  }

  const rejectOptional = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ analytics: false, marketing: false, necessary: true }))
    setVisible(false)
  }

  const savePreferences = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...preferences, necessary: true }))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 lg:p-6">
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card shadow-2xl p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Cookie className="h-5 w-5 text-violet-400 shrink-0" />
            <p className="text-sm font-semibold text-foreground">We use cookies</p>
          </div>
          <button type="button" onClick={rejectOptional}
            className="rounded-lg p-1 text-gray-400 hover:bg-secondary hover:text-foreground transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          We use cookies to improve your experience, analyze site traffic, and personalize content.
          By clicking &ldquo;Accept All&rdquo;, you consent to our use of cookies.{' '}
          <Link href="/privacy" className="text-violet-400 hover:text-violet-300 underline">Privacy Policy</Link>
        </p>

        {showDetails && (
          <div className="rounded-xl border border-border bg-background p-3 mb-4 space-y-3">
            {[
              { key: 'necessary', label: 'Necessary', description: 'Required for the website to function. Cannot be disabled.', locked: true },
              { key: 'analytics', label: 'Analytics', description: 'Help us understand how visitors use the site.', locked: false },
              { key: 'marketing', label: 'Marketing', description: 'Used to deliver personalized advertisements.', locked: false },
            ].map(({ key, label, description, locked }) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {label}
                    {locked && <span className="ml-1.5 text-xs text-gray-500">(always on)</span>}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                </div>
                <Switch
                  size="sm"
                  checked={locked || (key === 'necessary') || !!preferences[key as keyof typeof preferences]}
                  onChange={(on) => !locked && setPreferences((p) => ({ ...p, [key]: on }))}
                  disabled={locked}
                  label={label}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <Button fullWidth onClick={acceptAll}>Accept All</Button>
          {showDetails
            ? <Button variant="secondary" fullWidth onClick={savePreferences}>Save Preferences</Button>
            : <Button variant="ghost" fullWidth onClick={() => setShowDetails(true)}>Manage Preferences</Button>
          }
          <Button variant="ghost" fullWidth onClick={rejectOptional}>Reject Optional</Button>
        </div>
      </div>
    </div>
  )
}
