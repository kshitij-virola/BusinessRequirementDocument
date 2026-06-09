import type { Metadata } from 'next'
import Script from 'next/script'
import LoginForm from '@/components/auth/LoginForm'

export const metadata: Metadata = {
  title: 'Sign In - TROO AI',
}

const LoginPage = () => {
  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="text-sm text-gray-400 mt-1">Sign in to your TROO AI account</p>
      </div>
      <LoginForm />
    </>
  )
}

export default LoginPage;
