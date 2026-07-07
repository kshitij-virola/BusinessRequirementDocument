import Link from 'next/link'
import { Compass } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import { Button } from '@/components/ui/Button'
import { getSession } from '@/lib/session'

const NotFoundPage = async () => {
  const session = await getSession()
  const homeHref = session?.userId ? '/dashboard' : '/'

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="fixed inset-0 bg-gradient-to-br from-violet-950/30 via-transparent to-transparent pointer-events-none" />

      <header className="relative flex items-center px-4 sm:px-6 py-4 border-b border-border">
        <Logo size="md" href={homeHref} />
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <div className="inline-flex rounded-2xl bg-primary/10 p-4 text-primary">
          <Compass className="h-10 w-10" />
        </div>
        <p className="mt-6 text-sm font-medium text-primary">404</p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
          This page could not be found.
        </h1>
        <p className="mt-4 max-w-md text-gray-400">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
          <Link href={homeHref}>
            <Button size="lg">{session?.userId ? 'Go to Dashboard' : 'Back to Home'}</Button>
          </Link>
          {!session?.userId && (
            <Link href="/login">
              <Button variant="secondary" size="lg">Sign in</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage;
