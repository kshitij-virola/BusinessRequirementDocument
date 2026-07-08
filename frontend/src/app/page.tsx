import Link from 'next/link'
import { Zap, ImageIcon, Code2, Download } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import Badge from '@/components/ui/Badge'
import { getSession } from '@/lib/session'
import { Button } from '@/components/ui/Button'
import { ChatPromptInput } from '@/components/landing/ChatPromptInput'
import ThemeToggle from '@/components/ui/ThemeToggle'

const features = [
  { icon: Zap,       title: 'Text Prompt to Theme', description: 'Describe what you want and get a complete theme in seconds.',      accent: 'violet' as const },
  { icon: Code2,     title: 'Figma to HTML',        description: 'Paste any Figma URL and get production-ready HTML/CSS instantly.', accent: 'emerald' as const },
  { icon: ImageIcon, title: 'Image to Code',        description: 'Upload a screenshot and convert any UI design to clean code.',     accent: 'amber' as const },
  { icon: Download,  title: 'Download Source Code', description: 'Export complete theme packages as ZIP with all assets included.',  accent: 'blue' as const },
]

const accentMap = {
  violet: 'bg-primary/10 text-primary',
  emerald: 'bg-emerald-600/10 text-emerald-400',
  amber: 'bg-amber-600/10 text-amber-400',
  blue: 'bg-blue-600/10 text-blue-400',
}

const frameworks = ['React', 'Vue', 'Angular', 'HTML/CSS', 'WordPress']

const LandingPage = async () => {
  const session = await getSession()
  const isLoggedIn = !!session?.userId

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 bg-gradient-to-br from-violet-950/30 via-transparent to-transparent pointer-events-none" />

      {/* Nav */}
      <nav className="relative border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-4">
          <Logo size="md" href="/" />
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {isLoggedIn ? (
              <Link href="/dashboard">
                <Button size="sm">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">Sign in</Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">
                    <span className="hidden sm:inline">Get started free</span>
                    <span className="sm:hidden">Sign up</span>
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative mx-auto max-w-4xl px-4 sm:px-6 py-16 sm:py-24 text-center">
        <Badge className="mb-5 sm:mb-6 inline-flex">AI-Powered Theme Generation</Badge>
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
          Build themes with{' '}
          <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
            AI in seconds
          </span>
        </h1>
        <p className="mt-5 sm:mt-6 text-base sm:text-lg text-gray-400 max-w-2xl mx-auto">
          TROO AI generates production-ready frontend themes from text prompts, Figma designs, or screenshots. Export clean code for React, Vue, Angular, and more.
        </p>
        {!isLoggedIn && (
          <div className="mt-8 sm:mt-10 max-w-2xl mx-auto w-full">
            <ChatPromptInput />
            <p className="mt-3 text-xs text-gray-600 text-center">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:text-primary-hover transition-colors">Sign in</Link>
            </p>
          </div>
        )}
        <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center gap-2">
          {frameworks.map((fw) => <Badge key={fw} variant="muted">{fw}</Badge>)}
        </div>
      </section>

      {/* Features */}
      <section className="relative mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
        <h2 className="text-center text-2xl sm:text-3xl font-bold text-foreground mb-8 sm:mb-12">
          Everything you need to build faster
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description, accent }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-3 sm:space-y-4">
              <div className={`inline-flex rounded-lg p-2.5 ${accentMap[accent]}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                <p className="text-sm text-gray-400 mt-1">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative mx-auto max-w-2xl px-4 sm:px-6 py-16 sm:py-24 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Ready to start generating?</h2>
        <p className="mt-4 text-gray-400 text-sm sm:text-base">
          Join thousands of developers using TROO AI to build themes faster.
        </p>
        {isLoggedIn ? (
          <Link href="/dashboard" className="mt-7 sm:mt-8 inline-block w-full sm:w-auto">
            <Button size="lg" fullWidth className="sm:w-auto">Go to Dashboard</Button>
          </Link>
        ) : (
          <Link href="/signup" className="mt-7 sm:mt-8 inline-block w-full sm:w-auto">
            <Button size="lg" fullWidth className="sm:w-auto">Create free account</Button>
          </Link>
        )}
      </section>

      <footer className="border-t border-border py-6 sm:py-8 text-center">
        <p className="text-sm text-gray-600">&copy; 2026 TROO AI. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default LandingPage;
