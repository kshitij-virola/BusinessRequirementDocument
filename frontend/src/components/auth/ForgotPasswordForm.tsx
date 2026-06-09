'use client'
import { useActionState } from 'react'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import { forgotPassword } from '@/app/actions/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { FormState } from '@/types'

export const ForgotPasswordForm = () => {
  const [state, action, pending] = useActionState<FormState, FormData>(forgotPassword, undefined)

  if (state?.success) {
    return (
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="flex justify-center">
          <CheckCircle className="h-12 w-12 text-emerald-400" />
        </div>
        <p className="text-gray-300">{state.message}</p>
        <Link href="/login" className="text-violet-400 hover:text-violet-300 text-sm font-medium transition-colors">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <form action={action} className="space-y-4">
        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={state?.errors?.email?.[0]}
        />
        {state?.message && !state.success && (
          <p className="text-sm text-red-400">{state.message}</p>
        )}
        <Button type="submit" fullWidth loading={pending}>
          Send reset link
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Remember your password?{' '}
        <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}
