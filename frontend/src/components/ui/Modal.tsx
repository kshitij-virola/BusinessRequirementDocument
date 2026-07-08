'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export const Modal = ({ open, onClose, title, description, children, size = 'md' }: ModalProps) => {
  const overlayRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open || !mounted) return null

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' }

  // Rendered into document.body so ancestors with `backdrop-filter`/`filter`/`transform`
  // (e.g. the topbar's backdrop-blur) can't turn into a containing block and
  // confine this `fixed` overlay to their own box instead of the viewport.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div ref={overlayRef} className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full rounded-2xl border border-border bg-card shadow-2xl', sizes[size])}>
        {(title || description) && (
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              {title && <h2 className="text-base font-semibold text-foreground">{title}</h2>}
              {description && <p className="text-sm text-gray-400 mt-0.5">{description}</p>}
            </div>
            <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-secondary hover:text-foreground transition-colors shrink-0">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body
  )
}
