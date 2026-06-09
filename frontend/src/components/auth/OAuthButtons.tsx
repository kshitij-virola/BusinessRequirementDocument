'use client'
import { useState, useEffect, useRef } from 'react'
import { GitFork } from 'lucide-react'
import { googleOAuthLogin } from '@/app/actions/auth'
import { Button } from '@/components/ui/Button'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api'

interface OAuthButtonsProps {
  dividerLabel?: string
}

const OAuthButtons = ({ dividerLabel = 'or continue with' }: OAuthButtonsProps) => {
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(null)
  const [oauthError, setOauthError]     = useState<string | null>(null)
  const popupRef = useRef<Window | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.type === 'oauth_success') {
        cleanupPopup()
        const role = e.data.role as string | undefined
        window.location.href = role === 'admin' || role === 'superadmin' ? '/admin/dashboard' : '/dashboard'
      } else if (e.data?.type === 'oauth_error') {
        cleanupPopup()
        setOauthError('GitHub login failed. Please try again.')
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const cleanupPopup = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    setOauthLoading(null)
  }

  const handleGoogleLogin = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google
    if (!google) return

    setOauthError(null)
    setOauthLoading('google')

    const client = google.accounts.oauth2.initCodeClient({
      client_id:      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      scope:          'email profile',
      ux_mode:        'popup',
      callback:       async (response: { code?: string; error?: string }) => {
        if (!response.code || response.error) {
          setOauthLoading(null)
          return
        }
        const result = await googleOAuthLogin(response.code)
        if (result?.success) {
          window.location.href = result.redirectTo ?? '/dashboard'
        } else {
          setOauthError(result?.message ?? 'Google login failed. Please try again.')
          setOauthLoading(null)
        }
      },
      error_callback: () => {
        setOauthLoading(null)
      },
    })

    client.requestCode()
  }

  const handleGitHubLogin = () => {
    const url  = `${API}/auth/github`
    const w = 500, h = 650
    const left = Math.round(window.screenX + (window.outerWidth  - w) / 2)
    const top  = Math.round(window.screenY + (window.outerHeight - h) / 2)
    const popup = window.open(url, 'oauth_popup', `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`)
    if (!popup) return
    popupRef.current = popup
    setOauthError(null)
    setOauthLoading('github')
    timerRef.current = setInterval(() => {
      if (popup.closed) cleanupPopup()
    }, 500)
  }

  return (
    <>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-background px-3 text-gray-500">{dividerLabel}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="secondary"
          type="button"
          className="gap-2"
          loading={oauthLoading === 'google'}
          disabled={oauthLoading !== null}
          onClick={handleGoogleLogin}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Google
        </Button>
        <Button
          variant="secondary"
          type="button"
          className="gap-2"
          loading={oauthLoading === 'github'}
          disabled={oauthLoading !== null}
          onClick={handleGitHubLogin}
        >
          <GitFork className="h-4 w-4" />
          GitHub
        </Button>
      </div>

      {oauthError && (
        <p className="text-sm text-red-400 text-center">{oauthError}</p>
      )}
    </>
  )
}

export default OAuthButtons
