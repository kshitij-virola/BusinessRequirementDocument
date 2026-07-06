import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import axios from 'axios'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

// Local backend errors are { message }; the legacy thread/chat API returns
// Django-style { detail } or field errors under { error }. Falls back to a
// caller-supplied message when the response has none of those shapes.
export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; detail?: string; error?: string } | undefined
    return data?.message || data?.detail || data?.error || error.message || fallback
  }
  if (error instanceof Error) return error.message || fallback
  return fallback
}

export const formatDate = (date: string | Date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))

export const formatDateTime = (date: string | Date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))

export const truncateText = (text: string, maxLength: number) =>
  text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text

// Credits-used values are sometimes stored as negative ledger deltas
// upstream; consumed credits are always reported as a positive amount.
export const formatCredits = (credits: number) => Math.abs(credits).toLocaleString()

const MODE_TO_FRAMEWORK: Record<string, string> = {
  website:               'html',
  ui:                    'react',
  reactjs:               'react',
  angular:               'angular',
  vuejs:                 'vue',
  wordpress_divi_child:  'wordpress',
}

export const modeToFramework = (mode: string): string =>
  MODE_TO_FRAMEWORK[mode] ?? 'react'

export const deriveInputMode = (images: File[]): 'text' | 'image' =>
  images.length > 0 ? 'image' : 'text'
