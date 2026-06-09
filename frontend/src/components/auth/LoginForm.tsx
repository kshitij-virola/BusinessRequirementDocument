'use client'
import { useActionState, useState, useEffect } from 'react'
import Link from 'next/link'
import { login } from '@/app/actions/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import OAuthButtons from './OAuthButtons'
import type { FormState } from '@/types'

const LoginForm = () => {
  const [state, action, pending] = useActionState<FormState, FormData>(login, undefined)
  const [values, setValues] = useState({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (state?.errors) {
      const errors: Record<string, string> = {}
      if (state.errors.email?.[0]) errors.email = state.errors.email[0]
      if (state.errors.password?.[0]) errors.password = state.errors.password[0]
      setFieldErrors(errors)
    }
  }, [state])

  const handleChange = (field: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues(prev => ({ ...prev, [field]: e.target.value }))
    setFieldErrors(prev => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
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
          error={fieldErrors.email}
          value={values.email}
          onChange={handleChange('email')}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          error={fieldErrors.password}
          value={values.password}
          onChange={handleChange('password')}
        />

        {state?.message && !state.success && (
          <p className="text-sm text-red-400">{state.message}</p>
        )}

        <div className="flex items-center justify-between">
          <span />
          <Link
            href="/forgot-password"
            className="text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" fullWidth loading={pending}>
          Sign in
        </Button>
      </form>

      <OAuthButtons />

      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  )
}

export default LoginForm
