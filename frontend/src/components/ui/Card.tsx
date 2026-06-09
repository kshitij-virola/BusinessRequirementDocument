import { cn } from '@/lib/utils'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered'
}

export const Card = ({ className, variant = 'default', ...props }: CardProps) => {
  return (
    <div
      className={cn(
        'rounded-xl bg-card p-6',
        variant === 'bordered' && 'border border-border',
        className
      )}
      {...props}
    />
  )
}

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return <div className={cn('mb-4', className)} {...props} />
}

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
  return <h3 className={cn('text-lg font-semibold text-foreground', className)} {...props} />
}

export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => {
  return <p className={cn('text-sm text-gray-400', className)} {...props} />
}

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return <div className={cn('', className)} {...props} />
}