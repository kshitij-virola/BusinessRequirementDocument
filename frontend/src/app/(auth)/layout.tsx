import type { Metadata } from 'next'
import Logo from '@/components/ui/Logo'
import ThemeToggle from '@/components/ui/ThemeToggle'

export const metadata: Metadata = { title: 'TROO AI - Auth' }

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed inset-0 bg-gradient-to-br from-primary-900/20 via-transparent to-transparent pointer-events-none" />

      <header className="relative flex items-center justify-between px-4 sm:px-6 py-4 border-b border-border">
        <Logo size="md" href="/" />
        <ThemeToggle />
      </header>

      <div className="relative flex flex-col items-center justify-center flex-1 px-4 py-10 sm:py-12">
        <div className="mb-6 sm:mb-8">
          <Logo size="lg" />
        </div>
        <div className="w-full max-w-sm">
          <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 sm:p-8 shadow-2xl">
            {children}
          </div>
        </div>
        <p className="mt-6 sm:mt-8 text-xs text-gray-600 text-center max-w-xs">
          By continuing, you agree to our{' '}
          <span className="text-gray-500">Terms of Service</span> and{' '}
          <span className="text-gray-500">Privacy Policy</span>.
        </p>
      </div>
    </div>
  )
}

export default AuthLayout;
