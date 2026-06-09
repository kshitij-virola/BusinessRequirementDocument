'use client'
import { useActionState, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { signup } from '@/app/actions/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import OAuthButtons from './OAuthButtons'
import type { FormState } from '@/types'

type Fields = { name: string; email: string; password: string; confirmPassword: string }
type FieldErrors = Partial<Record<keyof Fields, string>>

const SignupForm = () => {
  const router = useRouter()
  const [state, action, pending] = useActionState<FormState, FormData>(signup, undefined)

  const [values, setValues] = useState<Fields>({ name: '', email: '', password: '', confirmPassword: '' })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  useEffect(() => {
    if (!state) return
    if (state.success) {
      router.push('/login')
      return
    }
    if (state.errors) {
      setFieldErrors({
        name:            state.errors.name?.[0],
        email:           state.errors.email?.[0],
        password:        state.errors.password?.[0],
        confirmPassword: state.errors.confirmPassword?.[0],
      })
    }
  }, [state, router])

  const handleChange = (field: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues(prev => ({ ...prev, [field]: e.target.value }))
    setFieldErrors(prev => ({ ...prev, [field]: undefined }))
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <form action={action} className="space-y-4">
        <Input
          label="Full Name"
          name="name"
          placeholder="John Doe"
          autoComplete="name"
          value={values.name}
          onChange={handleChange('name')}
          error={fieldErrors.name}
        />
        <Input
          label="Email"
          name="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={values.email}
          onChange={handleChange('email')}
          error={fieldErrors.email}
        />
        <Input
          label="Password"
          name="password"
          type="password"
          placeholder="Create a strong password"
          autoComplete="new-password"
          value={values.password}
          onChange={handleChange('password')}
          error={fieldErrors.password}
          hint="Min. 8 chars with letters, numbers, and symbols"
        />
        <Input
          label="Confirm Password"
          name="confirmPassword"
          type="password"
          placeholder="Repeat your password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={handleChange('confirmPassword')}
          error={fieldErrors.confirmPassword}
        />

        {state?.message && !state.success && (
          <p className="text-sm text-red-400">{state.message}</p>
        )}

        <Button type="submit" fullWidth loading={pending}>
          Create account
        </Button>
      </form>

      <OAuthButtons dividerLabel="or sign up with" />

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}

export default SignupForm
