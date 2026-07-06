import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm'

export const metadata: Metadata = {
  title: 'Reset Password - TROO AI',
}

const ResetPasswordPage = () => {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">Set a new password</h1>
        <p className="text-sm text-gray-400 mt-1">
          Choose a new password for your account
        </p>
      </div>
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </>
  )
}

export default ResetPasswordPage;
