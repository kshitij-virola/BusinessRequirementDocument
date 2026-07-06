'use client'
import { useEffect } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useToastStore, type Toast, type ToastVariant } from '@/store/toastStore'
import { cn } from '@/lib/utils'

const DISMISS_AFTER_MS = 5000

const VARIANT_STYLES: Record<ToastVariant, { icon: React.ElementType; className: string; iconClassName: string }> = {
  error:   { icon: AlertCircle,  className: 'border-error/20 bg-error/10',     iconClassName: 'text-error' },
  success: { icon: CheckCircle2, className: 'border-success/20 bg-success/10', iconClassName: 'text-success' },
  info:    { icon: Info,         className: 'border-border bg-card',          iconClassName: 'text-muted' },
}

const ToastItem = ({ toast }: { toast: Toast }) => {
  const dismissToast = useToastStore((s) => s.dismissToast)
  const { icon: Icon, className, iconClassName } = VARIANT_STYLES[toast.variant]

  useEffect(() => {
    const timer = setTimeout(() => dismissToast(toast.id), DISMISS_AFTER_MS)
    return () => clearTimeout(timer)
  }, [toast.id, dismissToast])

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2.5 rounded-xl border px-3.5 py-3 shadow-lg backdrop-blur-sm animate-toast-in',
        className,
      )}
    >
      <Icon className={cn('h-4.5 w-4.5 shrink-0 mt-0.5', iconClassName)} />
      <p className="text-sm text-foreground leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={() => dismissToast(toast.id)}
        className="ml-auto shrink-0 rounded-md p-0.5 text-muted hover:text-foreground transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export const ToastContainer = () => {
  const toasts = useToastStore((s) => s.toasts)
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-24 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}
