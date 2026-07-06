'use client'
import { useActionState, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, AlertTriangle } from 'lucide-react'
import { resetPassword } from '@/app/actions/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { FormState } from '@/types'

export const ResetPasswordForm = () => {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [state, action, pending] = useActionState<FormState, FormData>(resetPassword, undefined)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  if (!token) {
    return (
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="flex justify-center">
          <AlertTriangle className="h-12 w-12 text-amber-400" />
        </div>
        <p className="text-gray-300">This reset link is invalid or missing.</p>
        <Link href="/forgot-password" className="text-primary hover:text-primary-hover text-sm font-medium transition-colors">
          Request a new reset link
        </Link>
      </div>
    )
  }

  if (state?.success) {
    return (
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="h-12 w-12 text-emerald-400" />
        </div>
        <p className="text-gray-300">{state.message}</p>
        <Link href="/login" className="text-primary hover:text-primary-hover text-sm font-medium transition-colors">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <form action={action} className="space-y-4">
        <input type="hidden" name="token" value={token} />
        <Input
          label="New Password"
          name="password"
          type="password"
          placeholder="Create a strong password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={state?.errors?.password?.[0]}
          hint="Min. 8 chars with letters, numbers, and symbols"
        />
        <Input
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          placeholder="Repeat your password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={state?.errors?.confirmPassword?.[0]}
        />

        {state?.message && !state.success && (
          <p className="text-sm text-red-400">{state.message}</p>
        )}

        <Button type="submit" fullWidth loading={pending}>
          Reset password
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Remember your password?{' '}
        <Link href="/login" className="text-primary hover:text-primary-hover font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}
