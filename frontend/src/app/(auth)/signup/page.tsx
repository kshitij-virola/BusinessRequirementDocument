import type { Metadata } from 'next'
import SignupForm from '@/components/auth/SignupForm'

export const metadata: Metadata = {
  title: 'Create Account - TROO AI',
}

const SignupPage = () => {
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">Create an account</h1>
        <p className="text-sm text-gray-400 mt-1">Start building AI-powered themes today</p>
      </div>
      <SignupForm />
    </>
  )
}

export default SignupPage;
