import { create } from 'zustand'

export type ToastVariant = 'error' | 'success' | 'info'

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastState {
  toasts: Toast[]
  addToast: (message: string, variant: ToastVariant) => void
  dismissToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, variant) =>
    set((state) => ({
      toasts: [...state.toasts, { id: crypto.randomUUID(), message, variant }],
    })),
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

// Imperative helper so call sites (often inside async try/catch handlers) don't need
// to wire up the hook just to fire a one-off notification.
export const toast = {
  error: (message: string) => useToastStore.getState().addToast(message, 'error'),
  success: (message: string) => useToastStore.getState().addToast(message, 'success'),
  info: (message: string) => useToastStore.getState().addToast(message, 'info'),
}
