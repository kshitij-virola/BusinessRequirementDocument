'use server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { SignupFormSchema, LoginFormSchema, ForgotPasswordSchema } from '@/lib/definitions'
import { createSession, deleteSession } from '@/lib/session'
import type { FormState } from '@/types'

const redirectPathForRole = (role: string) => {
  return role === 'admin' || role === 'superadmin' ? '/admin/dashboard' : '/dashboard'
}

const forwardRefreshToken = async (setCookies: string[]) => {
  const value = extractCookie(setCookies, 'refreshToken')
  if (!value) return
  const cookieStore = await cookies()
  cookieStore.set('refreshToken', value, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   7 * 24 * 60 * 60,
    path:     '/',
  })
}

const setSessionCookies = async (accessToken: string, userId: string, role: string) => {
  await createSession(userId, role)
  const cookieStore = await cookies()
  cookieStore.set('troo_at', accessToken, {
    httpOnly: false,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60,
    path:     '/',
  })
}

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api'

const getSetCookies = (headers: Headers): string[] => {
  // Node 18.12+ exposes getSetCookie(); fall back to the single-value get().
  if (typeof (headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === 'function') {
    return (headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
  }
  const v = headers.get('set-cookie')
  return v ? [v] : []
}

const extractCookie = (setCookies: string[], name: string): string | null => {
  for (const h of setCookies) {
    const m = h.match(new RegExp(`^${name}=([^;]+)`, 'i'))
    if (m) return decodeURIComponent(m[1])
  }
  return null
}

const apiPost = async (path: string, body: unknown) => {
  try {
    const res = await fetch(`${API}${path}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      cache:   'no-store',
    })
    const json = await res.json() as { success: boolean; message: string; data?: unknown }
    return { ok: res.ok, status: res.status, json, setCookies: getSetCookies(res.headers), networkError: false }
  } catch (err: unknown) {
    // Backend unreachable (connection refused / timeout)
    const message = (err as Error).message ?? 'Network error'
    const isDown = message.includes('ECONNREFUSED') || message.includes('fetch failed') || message.includes('ETIMEDOUT')
    return {
      ok: false,
      status: 0,
      json: { success: false, message: isDown ? 'Cannot connect to server. Please try again later.' : message },
      setCookies: [] as string[],
      networkError: true,
    }
  }
}

export const signup = async (state: FormState, formData: FormData): Promise<FormState> => {
  const validated = SignupFormSchema.safeParse({
    name:            formData.get('name'),
    email:           formData.get('email'),
    password:        formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors }

  const { name, email, password } = validated.data
  const { ok, status, json } = await apiPost('/auth/register', { name, email, password })

  if (!ok) {
    if (status === 409) return { errors: { email: ['This email is already registered.'] } }
    return { message: json.message ?? 'Registration failed. Please try again.' }
  }

  return { success: true, message: 'Account created! You can now sign in.' }
}

export const login = async (state: FormState, formData: FormData): Promise<FormState> => {
  const validated = LoginFormSchema.safeParse({
    email:    formData.get('email'),
    password: formData.get('password'),
  })
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors }

  const { email, password } = validated.data
  const { ok, status, json, setCookies } = await apiPost('/auth/login', { email, password })

  if (!ok) {
    if (status === 401) return { errors: { password: ['Invalid email or password.'] } }
    if (status === 403) return { message: 'Your account has been suspended. Contact support.' }
    return { message: json.message ?? 'Login failed. Please try again.' }
  }

  const data = json.data as { accessToken: string; user: { id: string; role: string; email: string } }
  await setSessionCookies(data.accessToken, data.user.id, data.user.role)
  await forwardRefreshToken(setCookies)
  redirect(redirectPathForRole(data.user.role))
}

export const googleOAuthLogin = async (code: string): Promise<FormState> => {
  const { ok, json, setCookies } = await apiPost('/auth/google/exchange', { code })
  if (!ok) return { message: json.message ?? 'Google login failed. Please try again.' }

  const data = json.data as { accessToken: string; user: { id: string; role: string; email: string } }
  await setSessionCookies(data.accessToken, data.user.id, data.user.role)
  await forwardRefreshToken(setCookies)
  return { success: true, redirectTo: redirectPathForRole(data.user.role) }
}

export const forgotPassword = async (state: FormState, formData: FormData): Promise<FormState> => {
  const validated = ForgotPasswordSchema.safeParse({ email: formData.get('email') })
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors }

  const { email } = validated.data
  await apiPost('/auth/forgot-password', { email })
  return { success: true, message: 'If this email exists, a reset link has been sent.' }
}

export const logout = async () => {
  try {
    await fetch(`${API}/auth/logout`, { method: 'POST', cache: 'no-store' })
  } catch (err: unknown)  {
    console.log("logout err:", err)
    // ignore network errors during logout
  }
  const cookieStore = await cookies()
  cookieStore.delete('refreshToken')
  await deleteSession()
  redirect('/login')
}
