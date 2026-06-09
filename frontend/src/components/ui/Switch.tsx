'use client'
import { cn } from '@/lib/utils'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md'
  label?: string
}

/*
  Size math (all gaps equal):
  md  — track 44×24px, thumb 16×16px — gap = 4px
        inactive: translate-x-1 (4px), active: translate-x-6 (24px = 44-16-4)
  sm  — track 36×20px, thumb 14×14px — gap = 3px
        inactive: translate-x-[3px],  active: translate-x-[19px] (= 36-14-3)
*/
const cfg = {
  md: {
    track:         'h-6 w-11',
    thumb:         'h-4 w-4 top-1',
    thumbInactive: 'translate-x-1',
    thumbActive:   'translate-x-6',
  },
  sm: {
    track:         'h-5 w-9',
    thumb:         'h-3.5 w-3.5 top-[3px]',
    thumbInactive: 'translate-x-[3px]',
    thumbActive:   'translate-x-[19px]',
  },
}

export const Switch = ({ checked, onChange, disabled = false, size = 'md', label }: SwitchProps) => {
  const c = cfg[size]

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0 rounded-full transition-colors duration-200 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#16162a]',
        c.track,
        checked ? 'bg-violet-600' : 'bg-border',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      )}
    >
      <span className="sr-only">{label ?? (checked ? 'Enabled' : 'Disabled')}</span>
      <span
        className={cn(
          'pointer-events-none absolute rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out',
          c.thumb,
          checked ? c.thumbActive : c.thumbInactive
        )}
      />
    </button>
  )
}