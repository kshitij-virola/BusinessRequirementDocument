import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm'

export const metadata: Metadata = {
  title: 'Reset Password - TROO AI',
}

const ForgotPasswordPage = () => {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">Reset password</h1>
        <p className="text-sm text-gray-400 mt-1">
          Enter your email and we&apos;ll send you a reset link
        </p>
      </div>
      <ForgotPasswordForm />
    </>
  )
}

export default ForgotPasswordPage;
