import { cn } from '@/lib/utils'
import Link from 'next/link'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
  href?: string
}

const Logo = ({ className, size = 'md', href = '/' }: LogoProps) => {
  const sizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-4xl',
  }

  const content = (
    <span className={cn('font-bold tracking-tight', sizes[size], className)}>
      <span className="text-foreground">TROO</span>
      <span className="text-violet-500"> AI</span>
    </span>
  )

  return href ? <Link href={href}>{content}</Link> : content
}

export default Logo;
