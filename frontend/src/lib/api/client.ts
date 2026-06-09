import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse } from './types'

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api'

// ── Token storage ──────────────────────────────────────────────────────────────

const TOKEN_KEY    = 'troo_access_token'
const HANDOFF_KEY  = 'troo_at'  // short-lived cookie written by the login server action

export const tokenStore = {
  get(): string | null {
    if (typeof window === 'undefined') return null
    // 1. Check localStorage first (normal case after first visit)
    const ls = localStorage.getItem(TOKEN_KEY)
    if (ls) return ls
    // 2. Check the 1-minute handoff cookie set by the Next.js login server action.
    //    The server can't write to localStorage, so it passes the token via a
    //    short-lived client-readable cookie. We migrate it to localStorage here
    //    and immediately delete the cookie.
    const match = document.cookie.match(/(?:^|;\s*)troo_at=([^;]+)/)
    if (match) {
      const token = decodeURIComponent(match[1])
      localStorage.setItem(TOKEN_KEY, token)
      document.cookie = `${HANDOFF_KEY}=; max-age=0; path=/`
      return token
    }
    return null
  },
  set(token: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(TOKEN_KEY, token)
  },
  clear(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(TOKEN_KEY)
    document.cookie = `${HANDOFF_KEY}=; max-age=0; path=/`
  },
}

// ── Axios instance ─────────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL:         API_BASE,
  withCredentials: true,
  headers:         { 'Content-Type': 'application/json' },
  timeout:         30_000,
})

// Attach Bearer token to every outgoing request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Response interceptor ───────────────────────────────────────────────────────

let isRefreshing = false
type QueueEntry = { resolve: (token: string) => void; reject: (err: unknown) => void }
let queue: QueueEntry[] = []

const flushQueue = (token: string) => { queue.forEach(({ resolve }) => resolve(token)); queue = [] }
const rejectQueue = (err: unknown) => { queue.forEach(({ reject }) => reject(err));   queue = [] }

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const status   = error.response?.status
    const url      = error.config?.url ?? ''
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Pass every non-401 error straight through — no retry logic here.
    // Also skip the refresh cycle if:
    //  • this request already attempted a refresh (_retry flag)
    //  • the failing request IS the refresh endpoint (avoid infinite loop)
    if (
      status !== 401 ||
      original._retry ||
      url.includes('/auth/refresh')
    ) {
      return Promise.reject(error)
    }

    // If a refresh is already in flight, queue this request until it resolves.
    // Mark _retry so that if the backend still returns 401 after the new token
    // is applied we don't kick off a second refresh cycle.
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        queue.push({ resolve, reject })
      }).then((token) => {
        original._retry = true
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      })
    }

    original._retry = true
    isRefreshing    = true

    try {
      const { data } = await axios.post<ApiResponse<{ accessToken: string }>>(
        `${API_BASE}/auth/refresh`,
        {},
        { withCredentials: true }
      )
      const newToken = data.data.accessToken
      tokenStore.set(newToken)
      flushQueue(newToken)
      original.headers.Authorization = `Bearer ${newToken}`
      return api(original)
    } catch (refreshError) {
      // Refresh failed — clear local token then hit the Next.js clear-session
      // route, which deletes the httpOnly session cookie before redirecting
      // to /login. Without this, proxy.ts sees the cookie still set and
      // bounces the user straight back to /dashboard → infinite loop.
      tokenStore.clear()
      rejectQueue(refreshError)
      if (typeof window !== 'undefined') {
        window.location.href = '/api/auth/clear-session'
      }
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  }
)
