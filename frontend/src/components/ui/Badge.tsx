import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const badgeVariants = cva('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', {
  variants: {
    variant: {
      default: 'bg-violet-600/20 text-violet-400',
      success: 'bg-emerald-600/20 text-emerald-400',
      warning: 'bg-amber-600/20 text-amber-400',
      danger: 'bg-red-600/20 text-red-400',
      muted: 'bg-gray-600/20 text-gray-400',
    },
  },
  defaultVariants: { variant: 'default' },
})

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

const Badge = ({ className, variant, ...props }: BadgeProps) => {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />
}

export default Badge
