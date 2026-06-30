import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

export const formatDate = (date: string | Date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date))

export const formatCredits = (credits: number) => credits.toLocaleString()

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
